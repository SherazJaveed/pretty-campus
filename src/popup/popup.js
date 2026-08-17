// Pretty Campus - Popup Logic
document.addEventListener('DOMContentLoaded', function() {

  const darkToggle = document.getElementById('darkToggle');
  const themeCards = document.querySelectorAll('.theme-card');

  // Load saved settings
  chrome.storage.local.get(['darkMode', 'darkTheme'], function(data) {
    darkToggle.checked = data.darkMode || false;
    const activeTheme = data.darkTheme || 'midnight';
    
    themeCards.forEach(function(card) {
      card.classList.remove('active');
      if (card.dataset.theme === activeTheme) {
        card.classList.add('active');
      }
    });
  });

  // Toggle dark mode
  darkToggle.addEventListener('change', function() {
    const enabled = darkToggle.checked;
    const activeCard = document.querySelector('.theme-card.active');
    const theme = activeCard ? activeCard.dataset.theme : 'midnight';

    chrome.storage.local.set({ darkMode: enabled, darkTheme: theme });

    // Send message to content script
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'toggleDark',
          enabled: enabled,
          theme: theme
        });
      }
    });
  });

  // Theme selection
  themeCards.forEach(function(card) {
    card.addEventListener('click', function() {
      themeCards.forEach(function(c) { c.classList.remove('active'); });
      card.classList.add('active');

      const theme = card.dataset.theme;
      chrome.storage.local.set({ darkTheme: theme });

      if (darkToggle.checked) {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: 'changeTheme',
              theme: theme
            });
          }
        });
      }
    });
  });

});
