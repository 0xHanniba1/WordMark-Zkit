// WordMark-Zkit - Background Service Worker

// 安装时初始化
chrome.runtime.onInstalled.addListener(function() {
  console.log('WordMark-Zkit installed');
  
  // 初始化存储
  chrome.storage.local.get('eh_vocabulary', function(result) {
    if (!result.eh_vocabulary) {
      chrome.storage.local.set({ eh_vocabulary: [] });
    }
  });
});

// 监听来自 content script 的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'lookupWord') {
    fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(request.word))
      .then(function(response) {
        return response.json();
      })
      .then(function(data) {
        sendResponse({ success: true, data: data });
      })
      .catch(function(error) {
        sendResponse({ success: false, error: error.message });
      });
    return true; // 保持消息通道开放
  }
});
