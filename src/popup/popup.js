document.addEventListener('DOMContentLoaded', function() {
  var darkToggle = document.getElementById('darkToggle');
  var systemToggle = document.getElementById('systemToggle');
  var themeCards = document.querySelectorAll('.theme-card');
  if (!darkToggle) return;

  // Load all settings
  chrome.storage.local.get([
    'darkMode', 'darkTheme', 'followSystem',
    'pcStreak', 'pcXP', 'pcBadges'
  ], function(data) {
    darkToggle.checked = data.darkMode || false;
    if (systemToggle) systemToggle.checked = data.followSystem || false;

    var activeTheme = data.darkTheme || 'midnight';
    themeCards.forEach(function(card) {
      card.classList.remove('active');
      if (card.dataset.theme === activeTheme) card.classList.add('active');
    });

    if (data.followSystem) {
      darkToggle.disabled = true;
      darkToggle.parentElement.style.opacity = '0.5';
    }

    // Update status bar
    var streak = document.getElementById('statStreak');
    var xp = document.getElementById('statXP');
    var badges = document.getElementById('statBadges');
    if (streak) streak.textContent = data.pcStreak || 0;
    if (xp) xp.textContent = data.pcXP || 0;
    if (badges) badges.textContent = Object.keys(data.pcBadges || {}).length;
  });

  // Send message to active tab
  function send(msg) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (!tabs[0]) return;
      var id = tabs[0].id;
      chrome.tabs.sendMessage(id, msg, function() {
        if (chrome.runtime.lastError) {}
      });
    });
  }

  // Dark mode toggle
  darkToggle.addEventListener('change', function() {
    var enabled = darkToggle.checked;
    var activeCard = document.querySelector('.theme-card.active');
    var theme = activeCard ? activeCard.dataset.theme : 'midnight';
    chrome.storage.local.set({darkMode: enabled, darkTheme: theme, followSystem: false});
    if (systemToggle) systemToggle.checked = false;
    send({action: 'toggleDark', enabled: enabled, theme: theme});
  });

  // System theme toggle
  if (systemToggle) {
    systemToggle.addEventListener('change', function() {
      var enabled = systemToggle.checked;
      chrome.storage.local.set({followSystem: enabled});
      if (enabled) {
        darkToggle.disabled = true;
        darkToggle.parentElement.style.opacity = '0.5';
        send({action: 'followSystem'});
      } else {
        darkToggle.disabled = false;
        darkToggle.parentElement.style.opacity = '1';
      }
    });
  }

  // Theme cards
  themeCards.forEach(function(card) {
    card.addEventListener('click', function() {
      themeCards.forEach(function(c) { c.classList.remove('active'); });
      card.classList.add('active');
      var theme = card.dataset.theme;
      chrome.storage.local.set({darkTheme: theme});
      if (darkToggle.checked || (systemToggle && systemToggle.checked)) {
        send({action: 'changeTheme', theme: theme});
      }
    });
  });

  // Quick action buttons
  var btnWrapped = document.getElementById('btnWrapped');
  var btnExport = document.getElementById('btnExport');
  var btnFinals = document.getElementById('btnFinals');
  var btnSounds = document.getElementById('btnSounds');

  if (btnWrapped) {
    btnWrapped.addEventListener('click', function() {
      send({action: 'openWrapped'});
      window.close();
    });
  }

  if (btnExport) {
    btnExport.addEventListener('click', function() {
      send({action: 'exportGrades'});
      window.close();
    });
  }

  if (btnFinals) {
    btnFinals.addEventListener('click', function() {
      send({action: 'toggleFinals'});
      window.close();
    });
  }

  if (btnSounds) {
    btnSounds.addEventListener('click', function() {
      send({action: 'toggleSounds'});
      window.close();
    });
  }
});
