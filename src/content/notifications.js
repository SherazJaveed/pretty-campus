/* ========================================
   PRETTY CAMPUS - Smart Notifications
   Deadline alerts, grade changes, weekly digest
   ======================================== */

(function() {
  'use strict';

  var ALERT_TIMES = [
    { hours: 24, label: '24 hours', priority: 'warning' },
    { hours: 12, label: '12 hours', priority: 'warning' },
    { hours: 3, label: '3 hours', priority: 'urgent' },
    { hours: 1, label: '1 hour', priority: 'critical' }
  ];

  function init() {
    if (document.getElementById('pc-notif-center')) return;
    loadNotifications(function(notifications) {
      createNotifCenter(notifications);
      checkDeadlines();
    });
  }

  function loadNotifications(callback) {
    chrome.storage.local.get(['pcNotifications'], function(data) {
      callback(data.pcNotifications || []);
    });
  }

  function checkDeadlines() {
    if (typeof PrettyAPI === 'undefined') return;
    PrettyAPI.getTodos(function(err, todos) {
      if (!todos) return;
      var now = new Date();
      var newNotifs = [];
      todos.forEach(function(task) {
        if (task.completed) return;
        var due = new Date(task.dueDate);
        var hoursLeft = (due - now) / 3600000;
        ALERT_TIMES.forEach(function(alert) {
          if (hoursLeft > 0 && hoursLeft <= alert.hours) {
            newNotifs.push({
              id: 'deadline-' + task.id + '-' + alert.hours,
              type: 'deadline',
              priority: alert.priority,
              title: task.name,
              message: 'Due in ' + alert.label + ' — ' + task.courseName,
              courseName: task.courseName,
              courseColor: task.courseColor || '#7C3AED',
              timestamp: Date.now(),
              read: false
            });
          }
        });
        if (hoursLeft < 0 && hoursLeft > -48) {
          newNotifs.push({
            id: 'overdue-' + task.id,
            type: 'overdue',
            priority: 'critical',
            title: task.name,
            message: 'OVERDUE — ' + task.courseName,
            courseName: task.courseName,
            courseColor: task.courseColor || '#7C3AED',
            timestamp: Date.now(),
            read: false
          });
        }
      });
      chrome.storage.local.get(['pcNotifications', 'pcDismissed'], function(data) {
        var existing = data.pcNotifications || [];
        var dismissed = data.pcDismissed || [];
        var existingIds = existing.map(function(n) { return n.id; });
        newNotifs.forEach(function(n) {
          if (existingIds.indexOf(n.id) === -1 && dismissed.indexOf(n.id) === -1) {
            existing.unshift(n);
            if (n.priority === 'critical' || n.priority === 'urgent') {
              showNotifPopup(n);
            }
          }
        });
        existing = existing.slice(0, 50);
        chrome.storage.local.set({ pcNotifications: existing });
        updateBadge(existing);
        refreshNotifList(existing);
      });
    });
  }

  function createNotifCenter(notifications) {
    var center = document.createElement('div');
    center.id = 'pc-notif-center';
    var unreadCount = notifications.filter(function(n) { return !n.read; }).length;
    center.innerHTML =
      '<div class="pc-notif-bell" id="pcNotifBell" title="Notifications">' +
        '<span class="pc-notif-bell-icon">&#128276;</span>' +
        '<span class="pc-notif-badge" id="pcNotifBadge" style="' + (unreadCount > 0 ? '' : 'display:none') + '">' + unreadCount + '</span>' +
      '</div>' +
      '<div class="pc-notif-dropdown" id="pcNotifDropdown" style="display:none;">' +
        '<div class="pc-notif-header">' +
          '<span class="pc-notif-title">Notifications</span>' +
          '<button class="pc-notif-clear" id="pcNotifClear">Clear All</button>' +
        '</div>' +
        '<div class="pc-notif-list" id="pcNotifList">' + buildNotifListHTML(notifications) + '</div>' +
        '<div class="pc-notif-footer"><span id="pcNotifSummary">' + getSummary(notifications) + '</span></div>' +
      '</div>';
    document.body.appendChild(center);
    document.getElementById('pcNotifBell').addEventListener('click', function() {
      var dd = document.getElementById('pcNotifDropdown');
      var visible = dd.style.display !== 'none';
      dd.style.display = visible ? 'none' : 'block';
      if (!visible) {
        chrome.storage.local.get(['pcNotifications'], function(data) {
          var notifs = data.pcNotifications || [];
          notifs.forEach(function(n) { n.read = true; });
          chrome.storage.local.set({ pcNotifications: notifs });
          document.getElementById('pcNotifBadge').style.display = 'none';
        });
      }
    });
    document.getElementById('pcNotifClear').addEventListener('click', function() {
      chrome.storage.local.get(['pcNotifications'], function(data) {
        var notifs = data.pcNotifications || [];
        var dismissed = notifs.map(function(n) { return n.id; });
        chrome.storage.local.set({ pcNotifications: [], pcDismissed: dismissed });
        document.getElementById('pcNotifList').innerHTML = '<div class="pc-notif-empty">No notifications</div>';
        document.getElementById('pcNotifBadge').style.display = 'none';
        document.getElementById('pcNotifSummary').textContent = 'All clear!';
      });
    });
    document.addEventListener('click', function(e) {
      var c = document.getElementById('pc-notif-center');
      if (c && !c.contains(e.target)) {
        document.getElementById('pcNotifDropdown').style.display = 'none';
      }
    });
  }

  function buildNotifListHTML(notifications) {
    if (notifications.length === 0) return '<div class="pc-notif-empty">No notifications yet. Deadline alerts will appear here.</div>';
    return notifications.slice(0, 20).map(function(n) {
      var icon = n.type === 'overdue' ? '&#9888;' : n.priority === 'critical' ? '&#128680;' : n.priority === 'urgent' ? '&#9888;' : '&#128276;';
      var timeAgo = getTimeAgo(n.timestamp);
      return '<div class="pc-notif-item pc-notif-' + n.priority + (n.read ? ' pc-notif-read' : '') + '">' +
        '<div class="pc-notif-item-icon">' + icon + '</div>' +
        '<div class="pc-notif-item-content">' +
          '<div class="pc-notif-item-title">' + n.title + '</div>' +
          '<div class="pc-notif-item-message">' + n.message + '</div>' +
          '<div class="pc-notif-item-time">' + timeAgo + '</div>' +
        '</div>' +
        '<div class="pc-notif-item-color" style="background:' + n.courseColor + '"></div>' +
      '</div>';
    }).join('');
  }

  function refreshNotifList(notifications) {
    var list = document.getElementById('pcNotifList');
    if (list) list.innerHTML = buildNotifListHTML(notifications);
    var summary = document.getElementById('pcNotifSummary');
    if (summary) summary.textContent = getSummary(notifications);
  }

  function updateBadge(notifications) {
    var unread = notifications.filter(function(n) { return !n.read; }).length;
    var badge = document.getElementById('pcNotifBadge');
    if (badge) { badge.textContent = unread; badge.style.display = unread > 0 ? 'flex' : 'none'; }
  }

  function showNotifPopup(notif) {
    var popup = document.createElement('div');
    popup.className = 'pc-notif-popup pc-notif-popup-' + notif.priority;
    popup.innerHTML =
      '<div class="pc-notif-popup-icon">' + (notif.priority === 'critical' ? '&#128680;' : '&#9888;') + '</div>' +
      '<div class="pc-notif-popup-content">' +
        '<div class="pc-notif-popup-title">' + notif.title + '</div>' +
        '<div class="pc-notif-popup-msg">' + notif.message + '</div>' +
      '</div>';
    document.body.appendChild(popup);
    setTimeout(function() { popup.classList.add('pc-notif-popup-show'); }, 100);
    setTimeout(function() { popup.classList.remove('pc-notif-popup-show'); setTimeout(function() { popup.remove(); }, 300); }, 8000);
  }

  function getSummary(notifications) {
    var overdue = notifications.filter(function(n) { return n.type === 'overdue'; }).length;
    if (overdue > 0) return overdue + ' overdue!';
    var urgent = notifications.filter(function(n) { return !n.read && n.priority !== 'warning'; }).length;
    if (urgent > 0) return urgent + ' urgent';
    return notifications.length + ' total';
  }

  function getTimeAgo(timestamp) {
    var diff = Date.now() - timestamp;
    var mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return mins + 'm ago';
    var hours = Math.floor(mins / 60);
    if (hours < 24) return hours + 'h ago';
    return Math.floor(hours / 24) + 'd ago';
  }

  setInterval(checkDeadlines, 5 * 60 * 1000);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(init, 1500); });
  } else {
    setTimeout(init, 1500);
  }
})();
