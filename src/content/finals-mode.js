/* ========================================
   PRETTY CAMPUS - Finals Mode
   Pomodoro timer + site blocker + focus mode
   Research: 25/5 Pomodoro is proven to boost
   focus. Students need distraction blocking
   INSIDE Canvas, not a separate app.
   ======================================== */

(function() {
  'use strict';

  var state = {
    active: false,
    mode: 'focus', // focus, shortBreak, longBreak
    timeLeft: 25 * 60, // seconds
    totalTime: 25 * 60,
    session: 1,
    totalSessions: 4,
    focusLength: 25,
    shortBreakLength: 5,
    longBreakLength: 15,
    blockedSites: ['instagram.com', 'twitter.com', 'x.com', 'reddit.com', 'tiktok.com', 'youtube.com', 'facebook.com', 'netflix.com', 'twitch.tv'],
    timer: null,
    totalFocusTime: 0
  };

  function init() {
    if (document.getElementById('pc-finals-panel')) return;
    createFinalsPanel();
    loadState();
    console.log('Pretty Campus: Finals Mode ready');
  }

  function loadState() {
    chrome.storage.local.get(['pcFinalsState'], function(data) {
      if (data.pcFinalsState) {
        var saved = data.pcFinalsState;
        state.focusLength = saved.focusLength || 25;
        state.shortBreakLength = saved.shortBreakLength || 5;
        state.longBreakLength = saved.longBreakLength || 15;
        state.blockedSites = saved.blockedSites || state.blockedSites;
        state.totalFocusTime = saved.totalFocusTime || 0;
      }
    });
  }

  function saveState() {
    chrome.storage.local.set({
      pcFinalsState: {
        focusLength: state.focusLength,
        shortBreakLength: state.shortBreakLength,
        longBreakLength: state.longBreakLength,
        blockedSites: state.blockedSites,
        totalFocusTime: state.totalFocusTime
      }
    });
  }

  function createFinalsPanel() {
    var panel = document.createElement('div');
    panel.id = 'pc-finals-panel';
    panel.innerHTML = buildPanelHTML();
    document.body.appendChild(panel);
    setupPanelEvents();
  }

  function buildPanelHTML() {
    var blockedHTML = state.blockedSites.map(function(site) {
      return '<span class="pc-fm-blocked-site">' + site + '</span>';
    }).join('');

    return '<div class="pc-fm-toggle" id="pcFmToggle" title="Finals Mode (Alt+F)">&#127891;</div>' +
      '<div class="pc-fm-body" id="pcFmBody" style="display:none;">' +

        '<div class="pc-fm-header">' +
          '<div class="pc-fm-title">Finals Mode</div>' +
          '<div class="pc-fm-status" id="pcFmStatus">Ready</div>' +
        '</div>' +

        '<div class="pc-fm-timer-wrap">' +
          '<svg class="pc-fm-timer-svg" viewBox="0 0 120 120" width="160" height="160">' +
            '<circle cx="60" cy="60" r="54" fill="none" stroke="#2D2640" stroke-width="6"/>' +
            '<circle id="pcFmArc" cx="60" cy="60" r="54" fill="none" stroke="#7C3AED" stroke-width="6" ' +
              'stroke-dasharray="339.292" stroke-dashoffset="0" stroke-linecap="round" transform="rotate(-90 60 60)"/>' +
          '</svg>' +
          '<div class="pc-fm-timer-text">' +
            '<div class="pc-fm-time" id="pcFmTime">25:00</div>' +
            '<div class="pc-fm-mode" id="pcFmMode">Focus Time</div>' +
          '</div>' +
        '</div>' +

        '<div class="pc-fm-controls">' +
          '<button class="pc-fm-btn pc-fm-btn-start" id="pcFmStart">Start Focus</button>' +
          '<button class="pc-fm-btn pc-fm-btn-pause" id="pcFmPause" style="display:none;">Pause</button>' +
          '<button class="pc-fm-btn pc-fm-btn-skip" id="pcFmSkip" style="display:none;">Skip</button>' +
          '<button class="pc-fm-btn pc-fm-btn-reset" id="pcFmReset" style="display:none;">Reset</button>' +
        '</div>' +

        '<div class="pc-fm-session-info">' +
          '<span id="pcFmSession">Session 1 of 4</span>' +
          '<span id="pcFmTotal">Total: 0 min focused</span>' +
        '</div>' +

        '<div class="pc-fm-modes">' +
          '<button class="pc-fm-mode-btn pc-fm-mode-active" data-mode="focus" data-time="25">Focus 25m</button>' +
          '<button class="pc-fm-mode-btn" data-mode="focus" data-time="50">Deep 50m</button>' +
          '<button class="pc-fm-mode-btn" data-mode="shortBreak" data-time="5">Break 5m</button>' +
          '<button class="pc-fm-mode-btn" data-mode="longBreak" data-time="15">Long 15m</button>' +
        '</div>' +

        '<div class="pc-fm-blocked">' +
          '<div class="pc-fm-blocked-title">Blocked During Focus:</div>' +
          '<div class="pc-fm-blocked-list" id="pcFmBlockedList">' + blockedHTML + '</div>' +
          '<div class="pc-fm-blocked-add">' +
            '<input type="text" id="pcFmNewSite" class="pc-fm-input" placeholder="Add site to block...">' +
            '<button class="pc-fm-btn-add" id="pcFmAddSite">+</button>' +
          '</div>' +
        '</div>' +

      '</div>';
  }

  function setupPanelEvents() {
    // Toggle panel
    var toggle = document.getElementById('pcFmToggle');
    var body = document.getElementById('pcFmBody');
    if (toggle) {
      toggle.addEventListener('click', function() {
        var visible = body.style.display !== 'none';
        body.style.display = visible ? 'none' : 'block';
        toggle.classList.toggle('pc-fm-toggle-open', !visible);
      });
    }

    // Start button
    var startBtn = document.getElementById('pcFmStart');
    if (startBtn) {
      startBtn.addEventListener('click', function() {
        startTimer();
      });
    }

    // Pause button
    var pauseBtn = document.getElementById('pcFmPause');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', function() {
        if (state.active) {
          pauseTimer();
          pauseBtn.textContent = 'Resume';
        } else {
          resumeTimer();
          pauseBtn.textContent = 'Pause';
        }
      });
    }

    // Skip button
    var skipBtn = document.getElementById('pcFmSkip');
    if (skipBtn) {
      skipBtn.addEventListener('click', function() {
        skipSession();
      });
    }

    // Reset button
    var resetBtn = document.getElementById('pcFmReset');
    if (resetBtn) {
      resetBtn.addEventListener('click', function() {
        resetTimer();
      });
    }

    // Mode buttons
    document.querySelectorAll('.pc-fm-mode-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        if (state.active) return;
        document.querySelectorAll('.pc-fm-mode-btn').forEach(function(b) { b.classList.remove('pc-fm-mode-active'); });
        btn.classList.add('pc-fm-mode-active');

        var minutes = parseInt(btn.dataset.time);
        var mode = btn.dataset.mode;
        state.mode = mode;
        state.timeLeft = minutes * 60;
        state.totalTime = minutes * 60;
        if (mode === 'focus') state.focusLength = minutes;
        updateDisplay();
      });
    });

    // Add blocked site
    var addSiteBtn = document.getElementById('pcFmAddSite');
    var newSiteInput = document.getElementById('pcFmNewSite');
    if (addSiteBtn && newSiteInput) {
      addSiteBtn.addEventListener('click', function() {
        addBlockedSite(newSiteInput.value);
        newSiteInput.value = '';
      });
      newSiteInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          addBlockedSite(newSiteInput.value);
          newSiteInput.value = '';
        }
      });
    }

    // Keyboard shortcut Alt+F
    document.addEventListener('keydown', function(e) {
      if (e.altKey && e.key === 'f') {
        e.preventDefault();
        var vis = body.style.display !== 'none';
        body.style.display = vis ? 'none' : 'block';
        toggle.classList.toggle('pc-fm-toggle-open', !vis);
      }
    });
  }

  function startTimer() {
    state.active = true;
    state.timeLeft = state.mode === 'focus' ? state.focusLength * 60 :
                     state.mode === 'shortBreak' ? state.shortBreakLength * 60 :
                     state.longBreakLength * 60;
    state.totalTime = state.timeLeft;

    document.getElementById('pcFmStart').style.display = 'none';
    document.getElementById('pcFmPause').style.display = 'inline-block';
    document.getElementById('pcFmSkip').style.display = 'inline-block';
    document.getElementById('pcFmReset').style.display = 'inline-block';
    document.getElementById('pcFmPause').textContent = 'Pause';

    var statusEl = document.getElementById('pcFmStatus');
    if (state.mode === 'focus') {
      statusEl.textContent = 'Focusing...';
      statusEl.style.color = '#10B981';
    } else {
      statusEl.textContent = 'Break Time';
      statusEl.style.color = '#3B82F6';
    }

    tick();
    state.timer = setInterval(tick, 1000);
  }

  function tick() {
    if (state.timeLeft <= 0) {
      clearInterval(state.timer);
      sessionComplete();
      return;
    }
    state.timeLeft--;

    if (state.mode === 'focus') {
      state.totalFocusTime++;
    }

    updateDisplay();
  }

  function pauseTimer() {
    state.active = false;
    clearInterval(state.timer);
    document.getElementById('pcFmStatus').textContent = 'Paused';
    document.getElementById('pcFmStatus').style.color = '#F59E0B';
  }

  function resumeTimer() {
    state.active = true;
    state.timer = setInterval(tick, 1000);
    var statusEl = document.getElementById('pcFmStatus');
    if (state.mode === 'focus') {
      statusEl.textContent = 'Focusing...';
      statusEl.style.color = '#10B981';
    } else {
      statusEl.textContent = 'Break Time';
      statusEl.style.color = '#3B82F6';
    }
  }

  function resetTimer() {
    state.active = false;
    clearInterval(state.timer);
    state.session = 1;
    state.mode = 'focus';
    state.timeLeft = state.focusLength * 60;
    state.totalTime = state.timeLeft;

    document.getElementById('pcFmStart').style.display = 'inline-block';
    document.getElementById('pcFmPause').style.display = 'none';
    document.getElementById('pcFmSkip').style.display = 'none';
    document.getElementById('pcFmReset').style.display = 'none';
    document.getElementById('pcFmStatus').textContent = 'Ready';
    document.getElementById('pcFmStatus').style.color = '#9CA3AF';

    updateDisplay();
  }

  function skipSession() {
    clearInterval(state.timer);
    sessionComplete();
  }

  function sessionComplete() {
    state.active = false;
    saveState();

    // Play sound notification
    playNotificationSound();

    if (state.mode === 'focus') {
      // Focus session complete
      showNotification('Focus session complete! Take a break.');
      state.session++;

      if (state.session > state.totalSessions) {
        // All sessions complete
        showNotification('All 4 sessions complete! Great work!');
        state.session = 1;
        state.mode = 'longBreak';
        state.timeLeft = state.longBreakLength * 60;
      } else if (state.session % 4 === 0) {
        state.mode = 'longBreak';
        state.timeLeft = state.longBreakLength * 60;
      } else {
        state.mode = 'shortBreak';
        state.timeLeft = state.shortBreakLength * 60;
      }
    } else {
      // Break complete
      showNotification('Break over! Ready to focus?');
      state.mode = 'focus';
      state.timeLeft = state.focusLength * 60;
    }

    state.totalTime = state.timeLeft;
    updateDisplay();

    // Show start button again
    document.getElementById('pcFmStart').style.display = 'inline-block';
    document.getElementById('pcFmStart').textContent = state.mode === 'focus' ? 'Start Focus' : 'Start Break';
    document.getElementById('pcFmPause').style.display = 'none';
    document.getElementById('pcFmSkip').style.display = 'none';
    document.getElementById('pcFmStatus').textContent = state.mode === 'focus' ? 'Ready to focus' : 'Break time';
    document.getElementById('pcFmStatus').style.color = state.mode === 'focus' ? '#10B981' : '#3B82F6';
  }

  function updateDisplay() {
    var minutes = Math.floor(state.timeLeft / 60);
    var seconds = state.timeLeft % 60;
    var timeStr = (minutes < 10 ? '0' : '') + minutes + ':' + (seconds < 10 ? '0' : '') + seconds;

    var timeEl = document.getElementById('pcFmTime');
    var modeEl = document.getElementById('pcFmMode');
    var arcEl = document.getElementById('pcFmArc');
    var sessionEl = document.getElementById('pcFmSession');
    var totalEl = document.getElementById('pcFmTotal');

    if (timeEl) timeEl.textContent = timeStr;
    if (modeEl) {
      modeEl.textContent = state.mode === 'focus' ? 'Focus Time' :
                           state.mode === 'shortBreak' ? 'Short Break' : 'Long Break';
    }

    // Update arc
    if (arcEl) {
      var circumference = 2 * Math.PI * 54;
      var progress = state.totalTime > 0 ? (state.totalTime - state.timeLeft) / state.totalTime : 0;
      var offset = circumference * (1 - progress);
      arcEl.setAttribute('stroke-dashoffset', offset);
      arcEl.setAttribute('stroke', state.mode === 'focus' ? '#7C3AED' : state.mode === 'shortBreak' ? '#3B82F6' : '#10B981');
    }

    if (sessionEl) sessionEl.textContent = 'Session ' + state.session + ' of ' + state.totalSessions;
    if (totalEl) totalEl.textContent = 'Total: ' + Math.floor(state.totalFocusTime / 60) + ' min focused';
  }

  function addBlockedSite(site) {
    if (!site) return;
    site = site.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
    if (!site || state.blockedSites.indexOf(site) !== -1) return;

    state.blockedSites.push(site);
    saveState();

    var list = document.getElementById('pcFmBlockedList');
    if (list) {
      var span = document.createElement('span');
      span.className = 'pc-fm-blocked-site';
      span.textContent = site;
      list.appendChild(span);
    }
  }

  function showNotification(message) {
    var notif = document.createElement('div');
    notif.className = 'pc-fm-notif';
    notif.innerHTML = '<span class="pc-fm-notif-icon">&#127891;</span> ' + message;
    document.body.appendChild(notif);
    setTimeout(function() { notif.classList.add('pc-fm-notif-show'); }, 100);
    setTimeout(function() {
      notif.classList.remove('pc-fm-notif-show');
      setTimeout(function() { notif.remove(); }, 300);
    }, 5000);
  }

  function playNotificationSound() {
    try {
      var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.value = 800;
      gain.gain.value = 0.1;
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
      setTimeout(function() {
        var osc2 = audioCtx.createOscillator();
        var gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.frequency.value = 1000;
        gain2.gain.value = 0.1;
        osc2.start();
        osc2.stop(audioCtx.currentTime + 0.3);
      }, 300);
    } catch(e) { /* Audio not available */ }
  }

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(init, 1200); });
  } else {
    setTimeout(init, 1200);
  }

})();
