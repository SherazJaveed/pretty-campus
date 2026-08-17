// Pretty Campus - Background Service Worker
chrome.runtime.onInstalled.addListener(function(details) {
  if (details.reason === 'install') {
    console.log('Pretty Campus installed!');
    chrome.storage.local.set({
      darkMode: false,
      darkTheme: 'midnight',
      installedDate: new Date().toISOString()
    });
  }
});
