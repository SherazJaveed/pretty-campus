document.addEventListener('DOMContentLoaded', function() {
  var d = document.getElementById('darkToggle');
  if (!d) return;
  var s = document.getElementById('systemToggle');
  var sc = document.getElementById('scheduleToggle');
  var sr = document.getElementById('scheduleRow');
  var ss = document.getElementById('scheduleStart');
  var se = document.getElementById('scheduleEnd');
  var tc = document.querySelectorAll('.theme-card');

  chrome.storage.local.get(['darkMode', 'darkTheme', 'followSystem', 'darkSchedule'], function(data) {
    d.checked = data.darkMode || false;
    if (s) s.checked = data.followSystem || false;
    if (sc && data.darkSchedule && data.darkSchedule.enabled) {
      sc.checked = true;
      if (sr) sr.style.display = 'flex';
      if (ss) ss.value = data.darkSchedule.start || 18;
      if (se) se.value = data.darkSchedule.end || 7;
    }
    var at = data.darkTheme || 'midnight';
    tc.forEach(function(c) {
      c.classList.remove('active');
      if (c.dataset.theme === at) c.classList.add('active');
    });
    if (data.followSystem) {
      d.disabled = true;
      d.parentElement.parentElement.style.opacity = '0.5';
    }
  });

  function send(msg) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (!tabs[0]) return;
      var id = tabs[0].id;
      chrome.scripting.insertCSS({target: {tabId: id}, files: ['src/content/dark.css']}, function() {
        if (chrome.runtime.lastError) { /* ignore */ }
      });
      chrome.scripting.executeScript({target: {tabId: id}, files: ['src/content/content.js']}, function() {
        if (chrome.runtime.lastError) { /* ignore */ }
        setTimeout(function() {
          chrome.tabs.sendMessage(id, msg, function() {
            if (chrome.runtime.lastError) { /* ignore */ }
          });
        }, 200);
      });
    });
  }

  d.addEventListener('change', function() {
    var en = d.checked;
    var ac = document.querySelector('.theme-card.active');
    var th = ac ? ac.dataset.theme : 'midnight';
    chrome.storage.local.set({darkMode: en, darkTheme: th, followSystem: false});
    if (s) s.checked = false;
    send({action: 'toggleDark', enabled: en, theme: th});
  });

  if (s) {
    s.addEventListener('change', function() {
      var en = s.checked;
      chrome.storage.local.set({followSystem: en});
      if (en) {
        d.disabled = true;
        d.parentElement.parentElement.style.opacity = '0.5';
        if (sc) sc.checked = false;
        if (sr) sr.style.display = 'none';
        chrome.storage.local.set({darkSchedule: {enabled: false}});
        send({action: 'followSystem'});
      } else {
        d.disabled = false;
        d.parentElement.parentElement.style.opacity = '1';
      }
    });
  }

  if (sc) {
    sc.addEventListener('change', function() {
      var en = sc.checked;
      if (sr) sr.style.display = en ? 'flex' : 'none';
      if (en) {
        if (s) {
          s.checked = false;
          chrome.storage.local.set({followSystem: false});
        }
        d.disabled = true;
        d.parentElement.parentElement.style.opacity = '0.5';
      } else {
        d.disabled = false;
        d.parentElement.parentElement.style.opacity = '1';
      }
      var o = {
        enabled: en,
        start: ss ? parseInt(ss.value) : 18,
        end: se ? parseInt(se.value) : 7
      };
      chrome.storage.local.set({darkSchedule: o});
      send({action: 'followSystem'});
    });
  }

  if (ss) {
    ss.addEventListener('change', function() {
      var o = {
        enabled: sc ? sc.checked : false,
        start: parseInt(ss.value),
        end: se ? parseInt(se.value) : 7
      };
      chrome.storage.local.set({darkSchedule: o});
      send({action: 'followSystem'});
    });
  }

  if (se) {
    se.addEventListener('change', function() {
      var o = {
        enabled: sc ? sc.checked : false,
        start: ss ? parseInt(ss.value) : 18,
        end: parseInt(se.value)
      };
      chrome.storage.local.set({darkSchedule: o});
      send({action: 'followSystem'});
    });
  }

  tc.forEach(function(card) {
    card.addEventListener('click', function() {
      tc.forEach(function(c) { c.classList.remove('active'); });
      card.classList.add('active');
      var th = card.dataset.theme;
      chrome.storage.local.set({darkTheme: th});
      if (d.checked || (s && s.checked) || (sc && sc.checked)) {
        send({action: 'changeTheme', theme: th});
      }
    });
  });
});
