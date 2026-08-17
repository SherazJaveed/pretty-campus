// Pretty Campus - Popup Logic (Final Fix)
document.addEventListener('DOMContentLoaded', function() {

  var darkToggle = document.getElementById('darkToggle');
  var themeCards = document.querySelectorAll('.theme-card');

  // Load saved settings
  chrome.storage.local.get(['darkMode', 'darkTheme'], function(data) {
    darkToggle.checked = data.darkMode || false;
    var activeTheme = data.darkTheme || 'midnight';
    
    themeCards.forEach(function(card) {
      card.classList.remove('active');
      if (card.dataset.theme === activeTheme) {
        card.classList.add('active');
      }
    });
  });

  // Send message safely using callback style
  function sendToTab(message) {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (!tabs[0]) return;
      var tabId = tabs[0].id;

      // First try injecting CSS and JS directly
      chrome.scripting.insertCSS({
        target: { tabId: tabId },
        files: ['src/content/dark.css']
      }, function() { if (chrome.runtime.lastError) {} });

      chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['src/content/content.js']
      }, function() {
        if (chrome.runtime.lastError) {}
        // After injection, send message with slight delay
        setTimeout(function() {
          chrome.tabs.sendMessage(tabId, message, function(response) {
            if (chrome.runtime.lastError) {
              console.log('Pretty Campus: Page will apply changes on next reload');
            }
          });
        }, 200);
      });
    });
  }

  // Toggle dark mode
  darkToggle.addEventListener('change', function() {
    var enabled = darkToggle.checked;
    var activeCard = document.querySelector('.theme-card.active');
    var theme = activeCard ? activeCard.dataset.theme : 'midnight';

    chrome.storage.local.set({ darkMode: enabled, darkTheme: theme });
    sendToTab({ action: 'toggleDark', enabled: enabled, theme: theme });
  });

  // Theme selection
  themeCards.forEach(function(card) {
    card.addEventListener('click', function() {
      themeCards.forEach(function(c) { c.classList.remove('active'); });
      card.classList.add('active');

      var theme = card.dataset.theme;
      chrome.storage.local.set({ darkTheme: theme });

      if (darkToggle.checked) {
        sendToTab({ action: 'changeTheme', theme: theme });
      }
    });
  });

});
