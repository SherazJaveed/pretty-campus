/* ========================================
   PRETTY CAMPUS - Command Palette (Ctrl+K)
   Spotlight-style quick navigation for Canvas
   Research: Students waste time clicking through
   Canvas menus. No extension has a command palette.
   This is a Pretty Campus exclusive feature.
   ======================================== */

(function() {
  'use strict';

  var isOpen = false;

  // All available commands
  function getCommands() {
    var commands = [
      // Navigation
      { id: 'nav-dashboard', name: 'Go to Dashboard', category: 'Navigation', icon: '🏠', action: function() { navigate('/'); } },
      { id: 'nav-courses', name: 'Go to All Courses', category: 'Navigation', icon: '📚', action: function() { navigate('/courses'); } },
      { id: 'nav-calendar', name: 'Go to Calendar', category: 'Navigation', icon: '📅', action: function() { navigate('/calendar'); } },
      { id: 'nav-inbox', name: 'Go to Inbox', category: 'Navigation', icon: '✉️', action: function() { navigate('/conversations'); } },
      { id: 'nav-grades', name: 'Go to All Grades', category: 'Navigation', icon: '📊', action: function() { navigate('/grades'); } },
      { id: 'nav-files', name: 'Go to Files', category: 'Navigation', icon: '📁', action: function() { navigate('/files'); } },
      { id: 'nav-profile', name: 'Go to Profile', category: 'Navigation', icon: '👤', action: function() { navigate('/profile'); } },
      { id: 'nav-settings', name: 'Go to Settings', category: 'Navigation', icon: '⚙️', action: function() { navigate('/profile/settings'); } },
      { id: 'nav-notifications', name: 'Go to Notifications', category: 'Navigation', icon: '🔔', action: function() { navigate('/profile/communication'); } },

      // Pretty Campus features
      { id: 'pc-dark-toggle', name: 'Toggle Dark Mode', category: 'Pretty Campus', icon: '🌙', action: function() { toggleDarkMode(); } },
      { id: 'pc-theme-amoled', name: 'Theme: AMOLED Black', category: 'Themes', icon: '⚫', action: function() { setTheme('amoled'); } },
      { id: 'pc-theme-midnight', name: 'Theme: Midnight Violet', category: 'Themes', icon: '🟣', action: function() { setTheme('midnight'); } },
      { id: 'pc-theme-warm', name: 'Theme: Warm Dark', category: 'Themes', icon: '🟤', action: function() { setTheme('warm'); } },
      { id: 'pc-theme-ocean', name: 'Theme: Ocean', category: 'Themes', icon: '🌊', action: function() { applyCustomTheme('ocean'); } },
      { id: 'pc-theme-forest', name: 'Theme: Forest', category: 'Themes', icon: '🌲', action: function() { applyCustomTheme('forest'); } },
      { id: 'pc-theme-sunset', name: 'Theme: Sunset', category: 'Themes', icon: '🌅', action: function() { applyCustomTheme('sunset'); } },
      { id: 'pc-theme-rose', name: 'Theme: Rose', category: 'Themes', icon: '🌹', action: function() { applyCustomTheme('rose'); } },
      { id: 'pc-theme-lavender', name: 'Theme: Lavender Light', category: 'Themes', icon: '💜', action: function() { applyCustomTheme('lavender'); } },

      // Quick actions
      { id: 'act-scroll-top', name: 'Scroll to Top', category: 'Actions', icon: '⬆️', action: function() { window.scrollTo({top: 0, behavior: 'smooth'}); } },
      { id: 'act-scroll-bottom', name: 'Scroll to Bottom', category: 'Actions', icon: '⬇️', action: function() { window.scrollTo({top: document.body.scrollHeight, behavior: 'smooth'}); } },
      { id: 'act-refresh', name: 'Refresh Page', category: 'Actions', icon: '🔄', action: function() { window.location.reload(); } },
      { id: 'act-back', name: 'Go Back', category: 'Actions', icon: '⬅️', action: function() { window.history.back(); } },
      { id: 'act-forward', name: 'Go Forward', category: 'Actions', icon: '➡️', action: function() { window.history.forward(); } },
      { id: 'act-print', name: 'Print Page', category: 'Actions', icon: '🖨️', action: function() { window.print(); } },
      { id: 'act-fullscreen', name: 'Toggle Fullscreen', category: 'Actions', icon: '🖥️', action: function() { toggleFullscreen(); } }
    ];

    // Add course-specific navigation if we have course data
    if (typeof PrettyAPI !== 'undefined') {
      PrettyAPI.getCourses(function(err, courses) {
        if (courses) {
          courses.forEach(function(course) {
            commands.push({
              id: 'course-' + course.id, name: 'Go to ' + course.name + ': ' + (course.title || ''),
              category: 'Courses', icon: '📖', action: function() { navigate('/courses/' + course.id); }
            });
            commands.push({
              id: 'course-grades-' + course.id, name: course.name + ' Grades',
              category: 'Course Grades', icon: '📊', action: function() { navigate('/courses/' + course.id + '/grades'); }
            });
            commands.push({
              id: 'course-assign-' + course.id, name: course.name + ' Assignments',
              category: 'Course Assignments', icon: '📝', action: function() { navigate('/courses/' + course.id + '/assignments'); }
            });
            commands.push({
              id: 'course-modules-' + course.id, name: course.name + ' Modules',
              category: 'Course Modules', icon: '📦', action: function() { navigate('/courses/' + course.id + '/modules'); }
            });
          });
        }
      });
    }

    return commands;
  }

  function navigate(path) {
    var base = window.location.origin;
    window.location.href = base + path;
  }

  function toggleDarkMode() {
    chrome.storage.local.get(['darkMode', 'darkTheme'], function(data) {
      var newState = !data.darkMode;
      var theme = data.darkTheme || 'midnight';
      chrome.storage.local.set({ darkMode: newState });
      document.documentElement.classList.remove('pc-dark-amoled', 'pc-dark-midnight', 'pc-dark-warm');
      if (newState) document.documentElement.classList.add('pc-dark-' + theme);
    });
  }

  function setTheme(theme) {
    chrome.storage.local.set({ darkMode: true, darkTheme: theme });
    document.documentElement.classList.remove('pc-dark-amoled', 'pc-dark-midnight', 'pc-dark-warm');
    document.documentElement.classList.add('pc-dark-' + theme);
  }

  function applyCustomTheme(themeId) {
    if (typeof PrettyThemes !== 'undefined') {
      PrettyThemes.apply(themeId);
    }
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  // Create the command palette UI
  function createPalette() {
    if (document.getElementById('pc-cmd-overlay')) return;

    var overlay = document.createElement('div');
    overlay.id = 'pc-cmd-overlay';

    var palette = document.createElement('div');
    palette.id = 'pc-cmd-palette';

    palette.innerHTML =
      '<div class="pc-cmd-search-wrap">' +
        '<span class="pc-cmd-search-icon">&#128269;</span>' +
        '<input type="text" id="pc-cmd-input" class="pc-cmd-input" placeholder="Type a command... (courses, grades, themes, dark mode...)" autocomplete="off" spellcheck="false">' +
        '<span class="pc-cmd-shortcut">ESC</span>' +
      '</div>' +
      '<div class="pc-cmd-results" id="pc-cmd-results"></div>' +
      '<div class="pc-cmd-footer">' +
        '<span>&#8593;&#8595; Navigate</span>' +
        '<span>&#9166; Select</span>' +
        '<span>ESC Close</span>' +
      '</div>';

    overlay.appendChild(palette);
    document.body.appendChild(overlay);

    var input = document.getElementById('pc-cmd-input');
    var results = document.getElementById('pc-cmd-results');
    var commands = getCommands();
    var selectedIndex = 0;

    // Show all commands initially
    renderResults(commands, results, selectedIndex);

    // Focus input
    setTimeout(function() { input.focus(); }, 50);

    // Search
    input.addEventListener('input', function() {
      var query = input.value.toLowerCase().trim();
      var filtered = commands.filter(function(cmd) {
        return cmd.name.toLowerCase().indexOf(query) !== -1 ||
               cmd.category.toLowerCase().indexOf(query) !== -1;
      });
      selectedIndex = 0;
      renderResults(filtered, results, selectedIndex);
    });

    // Keyboard navigation
    input.addEventListener('keydown', function(e) {
      var items = results.querySelectorAll('.pc-cmd-item');

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
        updateSelection(items, selectedIndex);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        updateSelection(items, selectedIndex);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (items[selectedIndex]) {
          items[selectedIndex].click();
        }
      } else if (e.key === 'Escape') {
        closePalette();
      }
    });

    // Close on overlay click
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closePalette();
    });

    isOpen = true;
  }

  function renderResults(commands, container, selectedIndex) {
    var maxShow = 12;
    var shown = commands.slice(0, maxShow);
    var currentCategory = '';

    var html = '';
    shown.forEach(function(cmd, i) {
      if (cmd.category !== currentCategory) {
        currentCategory = cmd.category;
        html += '<div class="pc-cmd-category">' + currentCategory + '</div>';
      }
      var selected = i === selectedIndex ? ' pc-cmd-selected' : '';
      html += '<div class="pc-cmd-item' + selected + '" data-idx="' + i + '">' +
        '<span class="pc-cmd-item-icon">' + cmd.icon + '</span>' +
        '<span class="pc-cmd-item-name">' + cmd.name + '</span>' +
      '</div>';
    });

    if (shown.length === 0) {
      html = '<div class="pc-cmd-empty">No commands found</div>';
    }

    container.innerHTML = html;

    // Add click handlers
    container.querySelectorAll('.pc-cmd-item').forEach(function(item, i) {
      item.addEventListener('click', function() {
        var idx = parseInt(item.dataset.idx);
        if (commands[idx]) {
          closePalette();
          commands[idx].action();
        }
      });
      item.addEventListener('mouseenter', function() {
        container.querySelectorAll('.pc-cmd-item').forEach(function(el) { el.classList.remove('pc-cmd-selected'); });
        item.classList.add('pc-cmd-selected');
      });
    });
  }

  function updateSelection(items, index) {
    items.forEach(function(item) { item.classList.remove('pc-cmd-selected'); });
    if (items[index]) {
      items[index].classList.add('pc-cmd-selected');
      items[index].scrollIntoView({ block: 'nearest' });
    }
  }

  function closePalette() {
    var overlay = document.getElementById('pc-cmd-overlay');
    if (overlay) {
      overlay.classList.add('pc-cmd-closing');
      setTimeout(function() { overlay.remove(); }, 200);
    }
    isOpen = false;
  }

  // Listen for Ctrl+K
  document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      if (isOpen) {
        closePalette();
      } else {
        createPalette();
      }
    }
  });

})();
