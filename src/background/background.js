/* Pretty Campus - Background Service Worker v2.0.0 */

// Set default options on install
chrome.runtime.onInstalled.addListener(function(details) {
  if (details.reason === 'install') {
    chrome.storage.local.set({
      darkMode: false,
      darkTheme: 'midnight',
      followSystem: false,
      darkSchedule: { enabled: false, start: 18, end: 7 },
      pcStreak: 0,
      pcStreakDate: '',
      pcBadges: {},
      pcXP: 0,
      pcTasks: {},
      pcCustomTasks: [],
      pcSortBy: 'date',
      pcFilterCourse: 'all',
      pcNotifications: [],
      pcDismissed: []
    });
    console.log('Pretty Campus: Installed with default settings.');
  }
  if (details.reason === 'update') {
    console.log('Pretty Campus: Updated to v2.0.0');
  }
});
