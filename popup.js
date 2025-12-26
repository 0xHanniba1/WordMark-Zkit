// English Highlighter - Popup Script

document.addEventListener('DOMContentLoaded', function() {
  // Tab 切换
  var tabs = document.querySelectorAll('.tab');
  tabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      var panelId = this.dataset.panel;
      
      tabs.forEach(function(t) { t.classList.remove('active'); });
      this.classList.add('active');
      
      document.querySelectorAll('.panel').forEach(function(p) { 
        p.classList.remove('active'); 
      });
      document.getElementById(panelId).classList.add('active');
    });
  });

  // 加载生词本
  loadVocabulary();

  // 搜索功能
  document.getElementById('searchInput').addEventListener('input', function() {
    loadVocabulary(this.value);
  });

  // 导出功能
  document.getElementById('exportBtn').addEventListener('click', exportVocabulary);

  // 清空高亮记录
  document.getElementById('clearHighlights').addEventListener('click', function() {
    if (confirm('确定要清空所有页面的高亮记录吗？')) {
      chrome.storage.local.get(null, function(items) {
        var keysToRemove = Object.keys(items).filter(function(key) {
          return key.startsWith('eh_highlights_');
        });
        chrome.storage.local.remove(keysToRemove, function() {
          alert('已清空所有高亮记录');
        });
      });
    }
  });

  // 清空生词本
  document.getElementById('clearVocabulary').addEventListener('click', function() {
    if (confirm('确定要清空生词本吗？此操作不可恢复。')) {
      chrome.storage.local.set({ eh_vocabulary: [] }, function() {
        loadVocabulary();
        alert('已清空生词本');
      });
    }
  });
});

function loadVocabulary(searchQuery) {
  chrome.storage.local.get('eh_vocabulary', function(result) {
    var vocabulary = result.eh_vocabulary || [];
    var wordList = document.getElementById('wordList');
    
    // 更新统计
    document.getElementById('wordCount').textContent = vocabulary.length;
    
    var today = new Date().toDateString();
    var todayCount = vocabulary.filter(function(item) {
      return new Date(item.addedAt).toDateString() === today;
    }).length;
    document.getElementById('todayCount').textContent = todayCount;

    // 搜索过滤
    if (searchQuery) {
      searchQuery = searchQuery.toLowerCase();
      vocabulary = vocabulary.filter(function(item) {
        return item.word.toLowerCase().includes(searchQuery);
      });
    }

    // 渲染列表
    if (vocabulary.length === 0) {
      wordList.innerHTML = '<div class="empty-state">' +
        '<div class="icon">📖</div>' +
        '<p>' + (searchQuery ? '未找到匹配的单词' : '生词本为空') + '</p>' +
        '<p style="font-size: 12px; margin-top: 8px;">选中网页中的英文单词开始学习</p>' +
        '</div>';
      return;
    }

    var html = '';
    vocabulary.forEach(function(item, index) {
      html += '<div class="word-item" data-index="' + index + '">';
      html += '<div class="word">' + escapeHtml(item.word) + '</div>';
      
      var addedDate = new Date(item.addedAt);
      html += '<div class="meta">添加于 ' + formatDate(addedDate) + '</div>';
      
      html += '<div class="actions">';
      html += '<button class="btn-delete" data-word="' + escapeHtml(item.word) + '">删除</button>';
      if (item.source) {
        html += '<button class="btn-source" data-url="' + escapeHtml(item.source) + '">溯源</button>';
      }
      html += '</div>';
      html += '</div>';
    });

    wordList.innerHTML = html;

    // 绑定删除事件
    wordList.querySelectorAll('.btn-delete').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var word = this.dataset.word;
        deleteWord(word);
      });
    });

    // 绑定溯源事件
    wordList.querySelectorAll('.btn-source').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var url = this.dataset.url;
        chrome.tabs.create({ url: url });
      });
    });
  });
}

function deleteWord(word) {
  chrome.storage.local.get('eh_vocabulary', function(result) {
    var vocabulary = result.eh_vocabulary || [];
    vocabulary = vocabulary.filter(function(item) {
      return item.word.toLowerCase() !== word.toLowerCase();
    });
    chrome.storage.local.set({ eh_vocabulary: vocabulary }, function() {
      loadVocabulary(document.getElementById('searchInput').value);
    });
  });
}

function exportVocabulary() {
  chrome.storage.local.get('eh_vocabulary', function(result) {
    var vocabulary = result.eh_vocabulary || [];
    
    if (vocabulary.length === 0) {
      alert('生词本为空，无法导出');
      return;
    }

    // 生成 CSV
    var csv = 'Word,Added At,Source\n';
    vocabulary.forEach(function(item) {
      csv += '"' + (item.word || '') + '",';
      csv += '"' + (item.addedAt || '') + '",';
      csv += '"' + (item.source || '') + '"\n';
    });

    // 下载文件
    var blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = 'vocabulary_' + formatDateForFile(new Date()) + '.csv';
    link.click();
    URL.revokeObjectURL(url);
  });
}

function escapeHtml(text) {
  if (!text) return '';
  var div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(date) {
  var now = new Date();
  var diff = now - date;
  
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return Math.floor(diff / 60000) + ' 分钟前';
  if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小时前';
  if (diff < 604800000) return Math.floor(diff / 86400000) + ' 天前';
  
  return date.getFullYear() + '-' + 
    String(date.getMonth() + 1).padStart(2, '0') + '-' + 
    String(date.getDate()).padStart(2, '0');
}

function formatDateForFile(date) {
  return date.getFullYear() + 
    String(date.getMonth() + 1).padStart(2, '0') + 
    String(date.getDate()).padStart(2, '0');
}
