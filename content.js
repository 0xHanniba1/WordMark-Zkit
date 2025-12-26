// WordMark-Zkit - Content Script

(function() {
  'use strict';

  // 获取当前页面的唯一标识
  function getPageKey() {
    return 'eh_highlights_' + window.location.href;
  }

  // 显示 Toast 提示
  function showToast(message) {
    var existing = document.querySelector('.eh-toast');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.className = 'eh-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(function() {
      toast.remove();
    }, 2000);
  }

  // 移除工具栏
  function removePopups() {
    var toolbar = document.querySelector('.eh-toolbar');
    if (toolbar) toolbar.remove();
  }

  // 创建工具栏
  function createToolbar(x, y, selectedText) {
    removePopups();

    var toolbar = document.createElement('div');
    toolbar.className = 'eh-toolbar';

    // 高亮按钮
    var highlightBtn = document.createElement('button');
    highlightBtn.className = 'eh-btn-highlight';
    highlightBtn.textContent = '📌 高亮';
    highlightBtn.onclick = function(e) {
      e.stopPropagation();
      highlightSelection(selectedText);
      removePopups();
    };

    // 加入生词本按钮
    var addBtn = document.createElement('button');
    addBtn.className = 'eh-btn-add';
    addBtn.textContent = '➕ 生词本';
    addBtn.onclick = function(e) {
      e.stopPropagation();
      addToVocabulary(selectedText);
      removePopups();
    };

    toolbar.appendChild(highlightBtn);
    toolbar.appendChild(addBtn);

    // 定位工具栏
    toolbar.style.left = x + 'px';
    toolbar.style.top = (y + 10) + 'px';

    document.body.appendChild(toolbar);

    // 调整位置避免超出视口
    var rect = toolbar.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      toolbar.style.left = (window.innerWidth - rect.width - 10) + 'px';
    }
    if (rect.bottom > window.innerHeight) {
      toolbar.style.top = (y - rect.height - 10) + 'px';
    }
  }

  // 高亮选中的文本
  function highlightSelection(text) {
    var selection = window.getSelection();
    if (!selection.rangeCount) return;

    var range = selection.getRangeAt(0);
    var span = document.createElement('span');
    span.className = 'eh-highlight';
    span.dataset.word = text.toLowerCase();

    range.surroundContents(span);
    selection.removeAllRanges();

    // 保存高亮
    saveHighlights();
    showToast('已高亮: ' + text);
  }

  // 保存高亮到存储
  function saveHighlights() {
    var highlights = [];
    document.querySelectorAll('.eh-highlight').forEach(function(el) {
      var word = el.textContent;
      var path = getElementPath(el);
      highlights.push({ word: word, path: path });
    });

    var data = {};
    data[getPageKey()] = highlights;
    chrome.storage.local.set(data);
  }

  // 获取元素的 XPath
  function getElementPath(element) {
    var path = [];
    var current = element;

    while (current && current !== document.body) {
      var parent = current.parentNode;
      if (!parent) break;

      var siblings = Array.from(parent.children);
      var index = siblings.indexOf(current);
      var tagName = current.tagName.toLowerCase();
      path.unshift(tagName + '[' + index + ']');
      current = parent;
    }

    return path.join('/');
  }

  // 恢复页面高亮
  function restoreHighlights() {
    var pageKey = getPageKey();
    chrome.storage.local.get(pageKey, function(result) {
      var highlights = result[pageKey];
      if (!highlights || !highlights.length) return;

      // 使用 TreeWalker 遍历文本节点
      var walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );

      var textNodes = [];
      while (walker.nextNode()) {
        textNodes.push(walker.currentNode);
      }

      highlights.forEach(function(item) {
        var word = item.word;
        textNodes.forEach(function(node) {
          if (node.parentNode.classList && 
              node.parentNode.classList.contains('eh-highlight')) {
            return;
          }

          var text = node.textContent;
          var index = text.toLowerCase().indexOf(word.toLowerCase());

          if (index !== -1) {
            var before = text.substring(0, index);
            var match = text.substring(index, index + word.length);
            var after = text.substring(index + word.length);

            var span = document.createElement('span');
            span.className = 'eh-highlight';
            span.dataset.word = word.toLowerCase();
            span.textContent = match;

            var fragment = document.createDocumentFragment();
            if (before) fragment.appendChild(document.createTextNode(before));
            fragment.appendChild(span);
            if (after) fragment.appendChild(document.createTextNode(after));

            node.parentNode.replaceChild(fragment, node);
          }
        });
      });
    });
  }

  // 显示高亮单词的操作菜单
  function showHighlightMenu(word, x, y, highlightElement) {
    removePopups();

    var menu = document.createElement('div');
    menu.className = 'eh-toolbar';
    
    // 取消高亮按钮
    var unhighlightBtn = document.createElement('button');
    unhighlightBtn.className = 'eh-btn-unhighlight';
    unhighlightBtn.textContent = '✖ 取消高亮';
    unhighlightBtn.onclick = function(e) {
      e.stopPropagation();
      removeHighlight(highlightElement);
      removePopups();
    };

    // 加入生词本按钮
    var addBtn = document.createElement('button');
    addBtn.className = 'eh-btn-add';
    addBtn.textContent = '➕ 生词本';
    addBtn.onclick = function(e) {
      e.stopPropagation();
      addToVocabulary(word);
      removePopups();
    };

    menu.appendChild(unhighlightBtn);
    menu.appendChild(addBtn);

    menu.style.left = x + 'px';
    menu.style.top = (y + 10) + 'px';
    document.body.appendChild(menu);

    // 调整位置避免超出视口
    var rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      menu.style.left = (window.innerWidth - rect.width - 10) + 'px';
    }
    if (rect.bottom > window.innerHeight) {
      menu.style.top = (y - rect.height - 10) + 'px';
    }
  }

  // 取消单词高亮
  function removeHighlight(element) {
    if (!element) return;
    
    var text = element.textContent;
    var textNode = document.createTextNode(text);
    element.parentNode.replaceChild(textNode, element);
    
    // 更新存储
    saveHighlights();
    showToast('已取消高亮: ' + text);
  }

  // 在页面中高亮指定单词
  function highlightWordInPage(word) {
    var walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    var textNodes = [];
    while (walker.nextNode()) {
      var node = walker.currentNode;
      if (node.parentNode.classList && 
          node.parentNode.classList.contains('eh-highlight')) {
        continue;
      }
      if (node.textContent.toLowerCase().includes(word.toLowerCase())) {
        textNodes.push(node);
      }
    }

    // 只高亮第一个匹配
    if (textNodes.length > 0) {
      var node = textNodes[0];
      var text = node.textContent;
      var regex = new RegExp('(' + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'i');
      var parts = text.split(regex);

      if (parts.length > 1) {
        var fragment = document.createDocumentFragment();
        parts.forEach(function(part) {
          if (part.toLowerCase() === word.toLowerCase()) {
            var span = document.createElement('span');
            span.className = 'eh-highlight';
            span.dataset.word = word.toLowerCase();
            span.textContent = part;
            fragment.appendChild(span);
          } else if (part) {
            fragment.appendChild(document.createTextNode(part));
          }
        });
        node.parentNode.replaceChild(fragment, node);
        saveHighlights();
      }
    }

    showToast('已高亮: ' + word);
  }

  // 添加到生词本
  function addToVocabulary(word) {
    chrome.storage.local.get('eh_vocabulary', function(result) {
      var vocabulary = result.eh_vocabulary || [];

      // 检查是否已存在
      var exists = vocabulary.some(function(item) {
        return item.word.toLowerCase() === word.toLowerCase();
      });

      if (exists) {
        showToast('"' + word + '" 已在生词本中');
        return;
      }

      var entry = {
        word: word,
        addedAt: new Date().toISOString(),
        source: window.location.href
      };

      vocabulary.unshift(entry);
      chrome.storage.local.set({ eh_vocabulary: vocabulary }, function() {
        showToast('"' + word + '" 已加入生词本');
      });
    });
  }

  // 监听鼠标事件
  document.addEventListener('mouseup', function(e) {
    // 忽略点击在工具栏上
    if (e.target.closest('.eh-toolbar')) {
      return;
    }

    var selection = window.getSelection();
    var selectedText = selection.toString().trim();

    // 检查是否是有效的英文单词
    if (selectedText && /^[a-zA-Z]+(-[a-zA-Z]+)*$/.test(selectedText)) {
      var range = selection.getRangeAt(0);
      var rect = range.getBoundingClientRect();
      var x = rect.left + window.scrollX;
      var y = rect.bottom + window.scrollY;
      createToolbar(x, y, selectedText);
    } else {
      removePopups();
    }
  });

  // 点击高亮单词时显示操作菜单
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('eh-highlight')) {
      var word = e.target.textContent;
      var rect = e.target.getBoundingClientRect();
      showHighlightMenu(word, rect.left + window.scrollX, rect.bottom + window.scrollY, e.target);
    }
  });

  // 点击空白处关闭弹出框
  document.addEventListener('mousedown', function(e) {
    if (!e.target.closest('.eh-toolbar') && 
        !e.target.classList.contains('eh-highlight')) {
      removePopups();
    }
  });

  // 页面加载完成后恢复高亮
  if (document.readyState === 'complete') {
    restoreHighlights();
  } else {
    window.addEventListener('load', restoreHighlights);
  }

  // 监听来自 popup 的消息
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'getHighlightCount') {
      var count = document.querySelectorAll('.eh-highlight').length;
      sendResponse({ count: count });
    }
  });

})();
