chrome.browserAction.onClicked.addListener(function(tab) {
  chrome.storage.local.get('openai_api_key', function(data) {
    const key = data.openai_api_key;
    if (!key) {
      chrome.tabs.executeScript(tab.id, { code: 'alert("Set your API key first.")' });
      return;
    }

    chrome.tabs.executeScript(tab.id, { code: `window.__OPENAI_API_KEY__ = "${key}";` });
    chrome.tabs.executeScript(tab.id, { file: 'inject.js' });
  });
});
