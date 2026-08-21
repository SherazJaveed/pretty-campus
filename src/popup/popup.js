document.addEventListener('DOMContentLoaded', function() {
  var darkToggle = document.getElementById('darkToggle');
  var systemToggle = document.getElementById('systemToggle');
  var themeCards = document.querySelectorAll('.theme-card');
  if (!darkToggle) return;

  var featureToggles = {
    togGPA: 'pcFeatureGPA',
    togPred: 'pcFeaturePred',
    togTasks: 'pcFeatureTasks',
    togBadges: 'pcFeatureBadges',
    togAutoSave: 'pcFeatureAutoSave',
    togNotif: 'pcFeatureNotif',
    togNotes: 'pcFeatureNotes',
    togStats: 'pcFeatureStats'
  };

  var allKeys = ['darkMode', 'darkTheme', 'followSystem', 'pcStreak', 'pcXP', 'pcBadges'];
  Object.keys(featureToggles).forEach(function(id) { allKeys.push(featureToggles[id]); });

  chrome.storage.local.get(allKeys, function(data) {
    // Dark mode state
    darkToggle.checked = data.darkMode || false;
    if (systemToggle) systemToggle.checked = data.followSystem || false;

    // Active theme
    var activeTheme = data.darkTheme || 'midnight';
    themeCards.forEach(function(card) {
      card.classList.remove('active');
      if (card.dataset.theme === activeTheme) card.classList.add('active');
    });

    // System theme disables manual toggle
    if (data.followSystem) {
      darkToggle.disabled = true;
      darkToggle.closest('label').style.opacity = '0.5';
    }

    // Status bar
    var el;
    el = document.getElementById('statStreak'); if (el) el.textContent = data.pcStreak || 0;
    el = document.getElementById('statXP'); if (el) el.textContent = data.pcXP || 0;
    el = document.getElementById('statBadges'); if (el) el.textContent = Object.keys(data.pcBadges || {}).length;

    // Feature toggles: default ON, only OFF if explicitly set to false
    Object.keys(featureToggles).forEach(function(id) {
      var toggle = document.getElementById(id);
      if (toggle) {
        var key = featureToggles[id];
        toggle.checked = data[key] !== false;
      }
    });
  });

  // Send message to active tab
  function send(msg) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (!tabs[0]) return;
      chrome.tabs.sendMessage(tabs[0].id, msg, function() {
        if (chrome.runtime.lastError) {}
      });
    });
  }

  // Dark mode
  darkToggle.addEventListener('change', function() {
    var enabled = darkToggle.checked;
    var activeCard = document.querySelector('.theme-card.active');
    var theme = activeCard ? activeCard.dataset.theme : 'midnight';
    chrome.storage.local.set({darkMode: enabled, darkTheme: theme, followSystem: false});
    if (systemToggle) systemToggle.checked = false;
    send({action: 'toggleDark', enabled: enabled, theme: theme});
  });

  // System theme
  if (systemToggle) {
    systemToggle.addEventListener('change', function() {
      var enabled = systemToggle.checked;
      chrome.storage.local.set({followSystem: enabled});
      if (enabled) {
        darkToggle.disabled = true;
        darkToggle.closest('label').style.opacity = '0.5';
        send({action: 'followSystem'});
      } else {
        darkToggle.disabled = false;
        darkToggle.closest('label').style.opacity = '1';
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

  // Feature toggles
  Object.keys(featureToggles).forEach(function(id) {
    var toggle = document.getElementById(id);
    if (toggle) {
      toggle.addEventListener('change', function() {
        var saveData = {};
        saveData[featureToggles[id]] = toggle.checked;
        chrome.storage.local.set(saveData);
        // Tell content script to show/hide feature
        send({action: 'featureToggle', feature: featureToggles[id], enabled: toggle.checked});
      });
    }
  });

  // Quick actions
  var actions = {btnWrapped:'openWrapped', btnExport:'exportGrades', btnFinals:'toggleFinals', btnSounds:'toggleSounds'};
  Object.keys(actions).forEach(function(id) {
    var btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('click', function() {
        send({action: actions[id]});
        window.close();
      });
    }
  });
});
