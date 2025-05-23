chrome.action.onClicked.addListener(async (tab) => {
  chrome.storage.local.get('openai_api_key', async (data) => {
    const key = data.openai_api_key;
    if (!key) {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => alert("Please set your OpenAI API key in the extension options first.")
      });
      return;
    }

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (apiKey) => {
        window.__OPENAI_API_KEY__ = apiKey;
      },
      args: [key]
    });

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['inject.js']
    });
  });
});
