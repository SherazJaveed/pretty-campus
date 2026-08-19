/* ========================================
   PRETTY CAMPUS - Theme System
   30 University themes + 8 aesthetic themes
   + Custom theme creator
   Research: Students love school pride themes,
   BetterCampus has community themes but NO
   pre-built university themes ready to go
   ======================================== */

(function() {
  'use strict';

  var THEMES = {

    // === DARK THEMES (already in dark.css, managed here for UI) ===
    dark: [
      { id: 'amoled', name: 'AMOLED Black', bg: '#000000', card: '#111111', accent: '#7C3AED', text: '#E4E4E7', type: 'dark' },
      { id: 'midnight', name: 'Midnight Violet', bg: '#1E1B2E', card: '#2D2640', accent: '#7C3AED', text: '#E4E4E7', type: 'dark' },
      { id: 'warm', name: 'Warm Dark', bg: '#1C1917', card: '#292524', accent: '#FBBF24', text: '#E7E5E4', type: 'dark' }
    ],

    // === AESTHETIC THEMES ===
    aesthetic: [
      { id: 'ocean', name: 'Ocean', bg: '#0C1929', card: '#132F4C', accent: '#0EA5E9', text: '#E0F2FE', type: 'dark' },
      { id: 'forest', name: 'Forest', bg: '#14231A', card: '#1A3324', accent: '#22C55E', text: '#DCFCE7', type: 'dark' },
      { id: 'sunset', name: 'Sunset', bg: '#2D1810', card: '#3D2419', accent: '#F97316', text: '#FFF7ED', type: 'dark' },
      { id: 'rose', name: 'Rose', bg: '#2D1422', card: '#3D1C30', accent: '#EC4899', text: '#FCE7F3', type: 'dark' },
      { id: 'lavender', name: 'Lavender Light', bg: '#F5F3FF', card: '#EDE9FE', accent: '#7C3AED', text: '#1F2937', type: 'light' },
      { id: 'cream', name: 'Cream', bg: '#FFFBEB', card: '#FEF3C7', accent: '#D97706', text: '#1F2937', type: 'light' },
      { id: 'sky', name: 'Sky Blue', bg: '#F0F9FF', card: '#E0F2FE', accent: '#0284C7', text: '#1F2937', type: 'light' },
      { id: 'mint', name: 'Mint Fresh', bg: '#F0FDF4', card: '#DCFCE7', accent: '#16A34A', text: '#1F2937', type: 'light' }
    ],

    // === UNIVERSITY THEMES (Top 30 US + International) ===
    university: [
      { id: 'ohio-state', name: 'Ohio State', bg: '#1A0000', card: '#2D0000', accent: '#BB0000', text: '#E4E4E7', secondary: '#666666', type: 'dark' },
      { id: 'ucla', name: 'UCLA', bg: '#002B5C', card: '#003B7A', accent: '#2774AE', text: '#E4E4E7', secondary: '#FFD100', type: 'dark' },
      { id: 'stanford', name: 'Stanford', bg: '#1A0505', card: '#2D0A0A', accent: '#8C1515', text: '#E4E4E7', secondary: '#B1040E', type: 'dark' },
      { id: 'mit', name: 'MIT', bg: '#1A0508', card: '#2D0A10', accent: '#A31F34', text: '#E4E4E7', secondary: '#8A8B8C', type: 'dark' },
      { id: 'harvard', name: 'Harvard', bg: '#1A0508', card: '#2D0A10', accent: '#A41034', text: '#E4E4E7', secondary: '#1E1E1E', type: 'dark' },
      { id: 'uf', name: 'UF Gators', bg: '#001427', card: '#002040', accent: '#0021A5', text: '#E4E4E7', secondary: '#FA4616', type: 'dark' },
      { id: 'nyu', name: 'NYU', bg: '#1A0A2E', card: '#2D1250', accent: '#57068C', text: '#E4E4E7', secondary: '#8900E1', type: 'dark' },
      { id: 'michigan', name: 'Michigan', bg: '#001427', card: '#00274C', accent: '#00274C', text: '#E4E4E7', secondary: '#FFCB05', type: 'dark' },
      { id: 'texas', name: 'UT Austin', bg: '#1A0E00', card: '#2D1A00', accent: '#BF5700', text: '#E4E4E7', secondary: '#333F48', type: 'dark' },
      { id: 'penn-state', name: 'Penn State', bg: '#001E44', card: '#002D6A', accent: '#041E42', text: '#E4E4E7', secondary: '#FFFFFF', type: 'dark' },
      { id: 'unc', name: 'UNC', bg: '#001A33', card: '#002A52', accent: '#4B9CD3', text: '#E4E4E7', secondary: '#FFFFFF', type: 'dark' },
      { id: 'usc', name: 'USC', bg: '#1A0A00', card: '#2D1200', accent: '#990000', text: '#E4E4E7', secondary: '#FFC72C', type: 'dark' },
      { id: 'duke', name: 'Duke', bg: '#001A33', card: '#00285A', accent: '#003087', text: '#E4E4E7', secondary: '#FFFFFF', type: 'dark' },
      { id: 'cornell', name: 'Cornell', bg: '#1A0A05', card: '#2D1208', accent: '#B31B1B', text: '#E4E4E7', secondary: '#222222', type: 'dark' },
      { id: 'columbia', name: 'Columbia', bg: '#0D1B2A', card: '#1B2838', accent: '#B9D9EB', text: '#E4E4E7', secondary: '#FFFFFF', type: 'dark' },
      { id: 'yale', name: 'Yale', bg: '#00182D', card: '#002850', accent: '#00356B', text: '#E4E4E7', secondary: '#FFFFFF', type: 'dark' },
      { id: 'princeton', name: 'Princeton', bg: '#1A0E00', card: '#2D1A00', accent: '#E77500', text: '#E4E4E7', secondary: '#000000', type: 'dark' },
      { id: 'georgia', name: 'UGA', bg: '#1A0505', card: '#2D0A0A', accent: '#BA0C2F', text: '#E4E4E7', secondary: '#000000', type: 'dark' },
      { id: 'purdue', name: 'Purdue', bg: '#1A1100', card: '#2D1D00', accent: '#CEB888', text: '#E4E4E7', secondary: '#000000', type: 'dark' },
      { id: 'arizona', name: 'Arizona', bg: '#001C48', card: '#002D6E', accent: '#003366', text: '#E4E4E7', secondary: '#CC0033', type: 'dark' },
      { id: 'wisconsin', name: 'Wisconsin', bg: '#1A0508', card: '#2D0A10', accent: '#C5050C', text: '#E4E4E7', secondary: '#FFFFFF', type: 'dark' },
      { id: 'auburn', name: 'Auburn', bg: '#0C162A', card: '#0D2240', accent: '#03244D', text: '#E4E4E7', secondary: '#DD550C', type: 'dark' },
      { id: 'alabama', name: 'Alabama', bg: '#1A0508', card: '#2D0A10', accent: '#9E1B32', text: '#E4E4E7', secondary: '#828A8F', type: 'dark' },
      { id: 'virginia', name: 'UVA', bg: '#0D1528', card: '#162040', accent: '#232D4B', text: '#E4E4E7', secondary: '#F84C1E', type: 'dark' },
      { id: 'iowa', name: 'Iowa', bg: '#1A1100', card: '#2D1D00', accent: '#FFCD00', text: '#1F2937', secondary: '#000000', type: 'dark' },
      { id: 'cal', name: 'UC Berkeley', bg: '#001A33', card: '#002850', accent: '#003262', text: '#E4E4E7', secondary: '#FDB515', type: 'dark' },
      { id: 'notre-dame', name: 'Notre Dame', bg: '#0C2340', card: '#143A5E', accent: '#0C2340', text: '#E4E4E7', secondary: '#C99700', type: 'dark' },
      { id: 'clemson', name: 'Clemson', bg: '#1A0E00', card: '#2D1A05', accent: '#F56600', text: '#E4E4E7', secondary: '#522D80', type: 'dark' },
      { id: 'lsu', name: 'LSU', bg: '#1A0F2E', card: '#2D1950', accent: '#461D7C', text: '#E4E4E7', secondary: '#FDD023', type: 'dark' },
      { id: 'oregon', name: 'Oregon', bg: '#001A0D', card: '#002D17', accent: '#154733', text: '#E4E4E7', secondary: '#FEE123', type: 'dark' }
    ]
  };

  function init() {
    // Theme panel is shown in popup, not on page
    // This module provides the theme data and apply function
    
    // Load saved custom theme
    chrome.storage.local.get(['pcThemeId', 'pcCustomTheme'], function(data) {
      if (data.pcThemeId && data.pcThemeId !== 'amoled' && data.pcThemeId !== 'midnight' && data.pcThemeId !== 'warm') {
        applyTheme(data.pcThemeId, data.pcCustomTheme);
      }
    });
  }

  function applyTheme(themeId, customTheme) {
    var theme = findTheme(themeId) || customTheme;
    if (!theme) return;

    // Remove existing theme classes
    var classes = document.documentElement.className.split(' ').filter(function(c) {
      return !c.startsWith('pc-dark-') && !c.startsWith('pc-theme-');
    });

    if (theme.type === 'dark') {
      classes.push('pc-theme-custom-dark');
    } else {
      classes.push('pc-theme-custom-light');
    }

    document.documentElement.className = classes.join(' ');

    // Apply CSS variables
    var root = document.documentElement;
    root.style.setProperty('--pc-bg', theme.bg);
    root.style.setProperty('--pc-card', theme.card);
    root.style.setProperty('--pc-accent', theme.accent);
    root.style.setProperty('--pc-text', theme.text);
    if (theme.secondary) {
      root.style.setProperty('--pc-secondary', theme.secondary);
    }

    // Apply to body
    document.body.style.backgroundColor = theme.bg;
    document.body.style.color = theme.text;

    console.log('Pretty Campus: Theme applied - ' + (theme.name || themeId));
  }

  function findTheme(id) {
    var allThemes = THEMES.dark.concat(THEMES.aesthetic).concat(THEMES.university);
    return allThemes.find(function(t) { return t.id === id; });
  }

  function getAllThemes() {
    return THEMES;
  }

  function getThemesByCategory(category) {
    return THEMES[category] || [];
  }

  // Save custom theme
  function saveCustomTheme(theme) {
    chrome.storage.local.set({
      pcThemeId: theme.id || 'custom-' + Date.now(),
      pcCustomTheme: theme
    });
    applyTheme(null, theme);
  }

  // Initialize
  init();

  // Public API
  if (typeof window !== 'undefined') {
    window.PrettyThemes = {
      apply: applyTheme,
      find: findTheme,
      getAll: getAllThemes,
      getByCategory: getThemesByCategory,
      saveCustom: saveCustomTheme,
      THEMES: THEMES
    };
  }

})();
