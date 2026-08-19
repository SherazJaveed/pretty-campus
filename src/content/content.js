/* ========================================
   PRETTY CAMPUS - Content Script (Fixed)
   Runs on every Canvas / Instructure page
   ======================================== */

(function() {
  'use strict';

  console.log('Pretty Campus: Loading...');

  // Load saved settings immediately - don't wait for Canvas check
  chrome.storage.local.get(['darkMode', 'darkTheme'], function(data) {
    if (data.darkMode) {
      applyDarkMode(data.darkTheme || 'midnight');
    }
    console.log('Pretty Campus: Settings loaded - darkMode=' + data.darkMode + ' theme=' + data.darkTheme);
  });

  // Apply dark mode to the page
  function applyDarkMode(theme) {
    document.documentElement.classList.remove(
      'pc-dark-amoled', 'pc-dark-midnight', 'pc-dark-warm'
    );
    document.documentElement.classList.add('pc-dark-' + theme);
    console.log('Pretty Campus: Dark mode ON - ' + theme);
  }

  // Remove dark mode
  function removeDarkMode() {
    document.documentElement.classList.remove(
      'pc-dark-amoled', 'pc-dark-midnight', 'pc-dark-warm'
    );
    console.log('Pretty Campus: Dark mode OFF');
  }

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'toggleDark') {
      if (request.enabled) {
        applyDarkMode(request.theme);
      } else {
        removeDarkMode();
      }
      sendResponse({ success: true });
    }

    if (request.action === 'changeTheme') {
      applyDarkMode(request.theme);
      sendResponse({ success: true });
    }

    if (request.action === 'getStatus') {
      sendResponse({
        darkMode: document.documentElement.className.includes('pc-dark-'),
        url: window.location.href
      });
    }

    return true;
  });

  // Add Pretty Campus badge
  function addBadge() {
    if (document.querySelector('.pc-badge')) return;
    var badge = document.createElement('div');
    badge.className = 'pc-badge';
    badge.textContent = 'Pretty Campus';
    badge.addEventListener('click', function() {
      chrome.storage.local.get(['darkMode', 'darkTheme'], function(data) {
        var newState = !data.darkMode;
        var theme = data.darkTheme || 'midnight';
        chrome.storage.local.set({ darkMode: newState });
        if (newState) {
          applyDarkMode(theme);
        } else {
          removeDarkMode();
        }
      });
    });
    document.body.appendChild(badge);
  }

  // Wait for body to be ready
  if (document.body) {
    addBadge();
  } else {
    document.addEventListener('DOMContentLoaded', addBadge);
  }

  console.log('Pretty Campus: Ready!');

})();

// Theme test: listen for keyboard shortcut Alt+T to cycle themes
document.addEventListener('keydown', function(e) {
  if (e.altKey && e.key === 't') {
    e.preventDefault();
    var themes = ['ohio-state','nyu','ucla','stanford','mit','ocean','forest','sunset','rose','lavender','midnight'];
    var current = window._pcThemeIdx || 0;
    if (typeof PrettyThemes !== 'undefined') {
      PrettyThemes.apply(themes[current]);
      console.log('Theme: ' + themes[current]);
      window._pcThemeIdx = (current + 1) % themes.length;
    }
  }
});
