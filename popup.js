document.addEventListener('DOMContentLoaded', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0].id;

    // 加载当前主题并高亮激活按钮
    chrome.storage.local.get(['adhdTheme'], (result) => {
      if (result.adhdTheme) {
        document.querySelectorAll('.theme-btn').forEach(btn => {
          if (btn.dataset.theme === result.adhdTheme) {
            btn.classList.add('active');
          }
        });
      }
    });

    // 一键应用主题
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.dataset.theme;
        chrome.tabs.sendMessage(tabId, { action: 'applyADHD', theme: theme }, () => {
          // 更新UI激活状态
          document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        });
      });
    });

    // 恢复默认样式
    document.getElementById('removeADHD').addEventListener('click', () => {
      chrome.tabs.sendMessage(tabId, { action: 'removeADHD' });
      document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
    });

    // 手动高亮按钮
    document.querySelectorAll('.style-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const style = btn.dataset.style;
        chrome.tabs.sendMessage(tabId, { action: 'highlight', style: style });
        window.close(); // 点击后关闭弹窗
      });
    });

    // 清除当前页面高亮
    document.getElementById('clearPageHighlights').addEventListener('click', () => {
      chrome.tabs.sendMessage(tabId, { action: 'clearPageHighlights' });
    });

    // 清除所有高亮
    document.getElementById('clearAllHighlights').addEventListener('click', () => {
      if (confirm('确定要清除所有保存的高亮吗？')) {
        chrome.tabs.sendMessage(tabId, { action: 'clearAllHighlights' }, () => {
          updateStats(tabId);
        });
      }
    });

    // 文本指引线
    document.getElementById('toggleGuideLine').addEventListener('click', () => {
      chrome.tabs.sendMessage(tabId, { action: 'toggleGuideLine' }, (response) => {
        const btn = document.getElementById('toggleGuideLine');
        if (response && response.enabled) {
          btn.textContent = '禁用文本指引线';
          btn.classList.remove('action-btn');
          btn.classList.add('action-btn', 'secondary');
        } else {
          btn.textContent = '启用文本指引线';
          btn.classList.remove('action-btn', 'secondary');
          btn.classList.add('action-btn');
        }
      });
    });

    // 专注模式
    document.getElementById('toggleFocusMode').addEventListener('click', () => {
      chrome.tabs.sendMessage(tabId, { action: 'toggleFocusMode' }, (response) => {
        const btn = document.getElementById('toggleFocusMode');
        if (response && response.enabled) {
          btn.textContent = '禁用专注模式';
          btn.classList.remove('action-btn', 'secondary');
          btn.classList.add('action-btn');
        } else {
          btn.textContent = '启用专注模式';
          btn.classList.remove('action-btn');
          btn.classList.add('action-btn', 'secondary');
        }
      });
    });

    // 字体大小调整
    const fontSizeSlider = document.getElementById('fontSizeSlider');
    const fontSizeValue = document.getElementById('fontSizeValue');
    fontSizeSlider.addEventListener('input', () => {
      const size = parseInt(fontSizeSlider.value);
      fontSizeValue.textContent = size;
      chrome.tabs.sendMessage(tabId, { action: 'updateFontSize', size: size });
    });

    // 行间距调整
    const lineHeightSlider = document.getElementById('lineHeightSlider');
    const lineHeightValue = document.getElementById('lineHeightValue');
    lineHeightSlider.addEventListener('input', () => {
      const height = parseFloat(lineHeightSlider.value);
      lineHeightValue.textContent = height;
      chrome.tabs.sendMessage(tabId, { action: 'updateLineHeight', height: height });
    });

    // 加载保存的设置
    chrome.storage.local.get(['fontSize', 'lineHeight', 'reminderEnabled', 'reminderMinutes'], (result) => {
      if (result.fontSize) {
        fontSizeSlider.value = result.fontSize;
        fontSizeValue.textContent = result.fontSize;
      }
      if (result.lineHeight) {
        lineHeightSlider.value = result.lineHeight;
        lineHeightValue.textContent = result.lineHeight;
      }
      if (result.reminderMinutes) {
        reminderSlider.value = result.reminderMinutes;
        reminderValue.textContent = result.reminderMinutes;
      }
      if (result.reminderEnabled) {
        const reminderBtn = document.getElementById('toggleReminder');
        reminderBtn.textContent = '禁用专注提醒';
        reminderBtn.classList.remove('action-btn', 'secondary');
        reminderBtn.classList.add('action-btn');
      }
    });

    // 提醒时间调整
    const reminderSlider = document.getElementById('reminderSlider');
    const reminderValue = document.getElementById('reminderValue');
    reminderSlider.addEventListener('input', () => {
      const minutes = parseInt(reminderSlider.value);
      reminderValue.textContent = minutes;
      chrome.runtime.sendMessage({ action: 'updateReminderTime', minutes: minutes });
    });

    // 提醒开关
    document.getElementById('toggleReminder').addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'toggleReminder' }, (response) => {
        const btn = document.getElementById('toggleReminder');
        if (response && response.enabled) {
          btn.textContent = '禁用专注提醒';
          btn.classList.remove('action-btn', 'secondary');
          btn.classList.add('action-btn');
        } else {
          btn.textContent = '启用专注提醒';
          btn.classList.remove('action-btn');
          btn.classList.add('action-btn', 'secondary');
        }
      });
    });

    // 文本转语音
    document.getElementById('textToSpeech').addEventListener('click', () => {
      chrome.tabs.sendMessage(tabId, { action: 'textToSpeech' });
      window.close(); // 点击后关闭弹窗
    });

    // 更新统计
    updateStats(tabId);
  });
});

function updateStats(tabId) {
  chrome.storage.local.get(['highlights'], (result) => {
    const allHighlights = result.highlights || [];
    document.getElementById('totalCount').textContent = allHighlights.length;

    chrome.tabs.sendMessage(tabId, { action: 'getHighlights' }, (response) => {
      if (response && response.highlights) {
        document.getElementById('pageCount').textContent = response.highlights.length;
      }
    });
  });
}