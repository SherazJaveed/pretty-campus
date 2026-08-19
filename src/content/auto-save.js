/* ========================================
   PRETTY CAMPUS - Auto-Save System
   Saves discussion posts, assignment text,
   quiz essays, and inbox messages every 30 sec.
   Recovery button if Canvas times out.
   
   Research: Capterra review says "I wish there
   was an autosave. I've lost so much work due
   to not clicking individual saves."
   NO Canvas extension has built this yet.
   ======================================== */

(function() {
  'use strict';

  var SAVE_INTERVAL = 30000; // 30 seconds
  var SAVE_KEY_PREFIX = 'pc_autosave_';
  var watchedFields = [];
  var saveTimer = null;
  var lastSaveTime = 0;
  var saveCount = 0;

  function init() {
    // Find all text inputs on the page
    findTextFields();

    // Start auto-save timer
    startAutoSave();

    // Watch for dynamically added fields (Canvas loads content lazily)
    observeDOM();

    // Add recovery banner if saved data exists
    checkForRecovery();

    // Add save indicator
    addSaveIndicator();

    console.log('Pretty Campus: Auto-save active (' + watchedFields.length + ' fields detected)');
  }

  function findTextFields() {
    // Canvas text areas and editors
    var selectors = [
      'textarea',
      '[contenteditable="true"]',
      '.discussion-reply-box textarea',
      '.reply-textarea',
      '.ic-RichContentEditor textarea',
      '#assignment_submission_body',
      '#discussion_topic_message',
      '#compose-message-textarea',
      '#message_body',
      '.tox-edit-area iframe',
      'input[type="text"][name*="answer"]',
      'textarea[name*="answer"]',
      'textarea[name*="submission"]',
      'textarea[name*="comment"]',
      'textarea[name*="message"]',
      'textarea[name*="body"]',
      'textarea[name*="text"]'
    ];

    watchedFields = [];
    selectors.forEach(function(sel) {
      var elements = document.querySelectorAll(sel);
      elements.forEach(function(el) {
        if (!el.dataset.pcWatched) {
          el.dataset.pcWatched = 'true';
          watchedFields.push(el);

          // Save on every keystroke (debounced)
          el.addEventListener('input', debounce(function() {
            saveField(el);
          }, 2000));

          // Save on blur (leaving the field)
          el.addEventListener('blur', function() {
            saveField(el);
          });
        }
      });
    });

    // Also check TinyMCE iframes
    var iframes = document.querySelectorAll('.tox-edit-area iframe');
    iframes.forEach(function(iframe) {
      try {
        var iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        var body = iframeDoc.body;
        if (body && !body.dataset.pcWatched) {
          body.dataset.pcWatched = 'true';
          watchedFields.push(body);
          body.addEventListener('input', debounce(function() {
            saveField(body);
          }, 2000));
        }
      } catch(e) {
        // Cross-origin iframe, can't access
      }
    });
  }

  function saveField(el) {
    var key = getFieldKey(el);
    var value = getFieldValue(el);
    if (!value || value.trim().length === 0) return;

    var saveData = {};
    saveData[key] = {
      value: value,
      url: window.location.href,
      timestamp: Date.now(),
      fieldType: el.tagName
    };

    chrome.storage.local.set(saveData, function() {
      if (chrome.runtime.lastError) return;
      saveCount++;
      lastSaveTime = Date.now();
      updateSaveIndicator();
    });
  }

  function getFieldKey(el) {
    var pageUrl = window.location.pathname;
    var fieldId = el.id || el.name || el.className || 'field';
    return SAVE_KEY_PREFIX + pageUrl + '_' + fieldId;
  }

  function getFieldValue(el) {
    if (el.tagName === 'BODY' || el.contentEditable === 'true') {
      return el.innerHTML;
    }
    return el.value;
  }

  function setFieldValue(el, value) {
    if (el.tagName === 'BODY' || el.contentEditable === 'true') {
      el.innerHTML = value;
    } else {
      el.value = value;
    }
  }

  function startAutoSave() {
    if (saveTimer) clearInterval(saveTimer);
    saveTimer = setInterval(function() {
      watchedFields.forEach(function(el) {
        if (document.contains(el)) {
          saveField(el);
        }
      });
    }, SAVE_INTERVAL);
  }

  function observeDOM() {
    var observer = new MutationObserver(debounce(function() {
      findTextFields();
    }, 1000));

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  function checkForRecovery() {
    var pageUrl = window.location.pathname;
    var prefix = SAVE_KEY_PREFIX + pageUrl;

    chrome.storage.local.get(null, function(data) {
      if (chrome.runtime.lastError) return;

      var recoverable = [];
      Object.keys(data).forEach(function(key) {
        if (key.indexOf(prefix) === 0 && data[key].value) {
          var age = Date.now() - data[key].timestamp;
          // Only show recovery for saves less than 24 hours old
          if (age < 86400000) {
            recoverable.push({ key: key, data: data[key] });
          }
        }
      });

      if (recoverable.length > 0) {
        showRecoveryBanner(recoverable);
      }
    });
  }

  function showRecoveryBanner(recoverable) {
    // Don't show if already showing
    if (document.getElementById('pc-recovery-banner')) return;

    var timeSince = getTimeSince(recoverable[0].data.timestamp);

    var banner = document.createElement('div');
    banner.id = 'pc-recovery-banner';
    banner.innerHTML =
      '<div class="pc-recovery-inner">' +
        '<span class="pc-recovery-icon">&#128190;</span>' +
        '<span class="pc-recovery-text">Pretty Campus found unsaved work from ' + timeSince + ' ago</span>' +
        '<button class="pc-recovery-btn pc-recovery-restore" id="pcRestore">Restore</button>' +
        '<button class="pc-recovery-btn pc-recovery-dismiss" id="pcDismiss">Dismiss</button>' +
      '</div>';

    // Insert at top of content
    var content = document.getElementById('content') || document.body;
    content.insertBefore(banner, content.firstChild);

    // Restore button
    document.getElementById('pcRestore').addEventListener('click', function() {
      recoverable.forEach(function(item) {
        // Find matching field
        var fields = document.querySelectorAll('textarea, [contenteditable="true"]');
        fields.forEach(function(el) {
          var key = getFieldKey(el);
          if (key === item.key) {
            setFieldValue(el, item.data.value);
          }
        });
      });
      banner.remove();
      showToast('Work restored successfully!');
    });

    // Dismiss button
    document.getElementById('pcDismiss').addEventListener('click', function() {
      recoverable.forEach(function(item) {
        chrome.storage.local.remove(item.key);
      });
      banner.remove();
    });
  }

  function addSaveIndicator() {
    if (document.getElementById('pc-save-indicator')) return;

    var indicator = document.createElement('div');
    indicator.id = 'pc-save-indicator';
    indicator.className = 'pc-save-indicator';
    indicator.innerHTML = '<span class="pc-save-dot"></span> Auto-save active';
    document.body.appendChild(indicator);
  }

  function updateSaveIndicator() {
    var indicator = document.getElementById('pc-save-indicator');
    if (!indicator) return;

    indicator.innerHTML = '<span class="pc-save-dot pc-save-dot-active"></span> Saved just now';
    indicator.classList.add('pc-save-flash');

    setTimeout(function() {
      indicator.classList.remove('pc-save-flash');
      indicator.innerHTML = '<span class="pc-save-dot"></span> Auto-save active';
    }, 3000);
  }

  function showToast(message) {
    var toast = document.createElement('div');
    toast.className = 'pc-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(function() { toast.classList.add('pc-toast-show'); }, 100);
    setTimeout(function() {
      toast.classList.remove('pc-toast-show');
      setTimeout(function() { toast.remove(); }, 300);
    }, 3000);
  }

  function getTimeSince(timestamp) {
    var diff = Date.now() - timestamp;
    var mins = Math.floor(diff / 60000);
    if (mins < 1) return 'less than a minute';
    if (mins < 60) return mins + ' minute' + (mins === 1 ? '' : 's');
    var hours = Math.floor(mins / 60);
    if (hours < 24) return hours + ' hour' + (hours === 1 ? '' : 's');
    var days = Math.floor(hours / 24);
    return days + ' day' + (days === 1 ? '' : 's');
  }

  function debounce(fn, delay) {
    var timer;
    return function() {
      var args = arguments;
      var context = this;
      clearTimeout(timer);
      timer = setTimeout(function() { fn.apply(context, args); }, delay);
    };
  }

  // Clean up old saves (older than 7 days)
  function cleanOldSaves() {
    chrome.storage.local.get(null, function(data) {
      if (chrome.runtime.lastError) return;
      var keysToRemove = [];
      Object.keys(data).forEach(function(key) {
        if (key.indexOf(SAVE_KEY_PREFIX) === 0 && data[key].timestamp) {
          if (Date.now() - data[key].timestamp > 7 * 86400000) {
            keysToRemove.push(key);
          }
        }
      });
      if (keysToRemove.length > 0) {
        chrome.storage.local.remove(keysToRemove);
      }
    });
  }

  // Run cleanup on load
  cleanOldSaves();

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(init, 1000); });
  } else {
    setTimeout(init, 1000);
  }

})();
