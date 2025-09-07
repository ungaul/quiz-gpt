
document.getElementById('save').onclick = () => {
    const key = document.getElementById('apiKey').value.trim();
    chrome.storage.local.set({ openai_api_key: key }, () => {
        document.getElementById('status').textContent = 'Saved successfully.';
    });
};

chrome.storage.local.get('openai_api_key', (data) => {
    if (data.openai_api_key) {
        document.getElementById('apiKey').value = data.openai_api_key;
    }
});