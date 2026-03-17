chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'highlight-red-bg',
    title: '红色背景',
    contexts: ['selection']
  });
  chrome.contextMenus.create({
    id: 'highlight-yellow-bg',
    title: '黄色背景',
    contexts: ['selection']
  });
  chrome.contextMenus.create({
    id: 'highlight-blue-bg',
    title: '蓝色背景',
    contexts: ['selection']
  });
  chrome.contextMenus.create({
    id: 'highlight-bold',
    title: '加粗',
    contexts: ['selection']
  });
  chrome.contextMenus.create({
    id: 'highlight-underline',
    title: '下划线',
    contexts: ['selection']
  });
  chrome.contextMenus.create({
    id: 'highlight-red-text',
    title: '红色文字',
    contexts: ['selection']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const map = {
    'highlight-red-bg': 'red-bg',
    'highlight-yellow-bg': 'yellow-bg',
    'highlight-blue-bg': 'blue-bg',
    'highlight-bold': 'bold',
    'highlight-underline': 'underline',
    'highlight-red-text': 'red-text'
  };
  if (map[info.menuItemId]) {
    chrome.tabs.sendMessage(tab.id, {
      action: 'highlight',
      style: map[info.menuItemId]
    });
  }
});

// ==================== 定时提醒功能 ====================
let reminderTimer = null;
let reminderEnabled = false;
let reminderMinutes = 25;

// 加载保存的提醒设置
chrome.storage.local.get(['reminderEnabled', 'reminderMinutes'], (result) => {
  if (result.reminderEnabled !== undefined) {
    reminderEnabled = result.reminderEnabled;
  }
  if (result.reminderMinutes) {
    reminderMinutes = result.reminderMinutes;
  }
  if (reminderEnabled) {
    startReminderTimer();
  }
});

// 消息监听器
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'toggleReminder':
      reminderEnabled = !reminderEnabled;
      chrome.storage.local.set({ reminderEnabled: reminderEnabled });
      if (reminderEnabled) {
        startReminderTimer();
      } else {
        stopReminderTimer();
      }
      sendResponse({ enabled: reminderEnabled });
      break;
    case 'updateReminderTime':
      reminderMinutes = request.minutes;
      chrome.storage.local.set({ reminderMinutes: reminderMinutes });
      if (reminderEnabled) {
        stopReminderTimer();
        startReminderTimer();
      }
      sendResponse({ success: true });
      break;
  }
  return true;
});

// 启动提醒定时器
function startReminderTimer() {
  stopReminderTimer(); // 确保没有重复的定时器
  const milliseconds = reminderMinutes * 60 * 1000;
  reminderTimer = setTimeout(() => {
    showReminderNotification();
    // 循环提醒
    if (reminderEnabled) {
      startReminderTimer();
    }
  }, milliseconds);
}

// 停止提醒定时器
function stopReminderTimer() {
  if (reminderTimer) {
    clearTimeout(reminderTimer);
    reminderTimer = null;
  }
}

// 显示提醒通知
function showReminderNotification() {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: 'ADHD 阅读助手',
    message: '专注时间已到！建议休息一下，活动身体，然后再继续阅读。',
    buttons: [
      { title: '知道了' },
      { title: '再专注5分钟' }
    ],
    priority: 2
  });
}

// 处理通知按钮点击
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (buttonIndex === 1) { // 再专注5分钟
    const fiveMinutes = 5 * 60 * 1000;
    setTimeout(() => {
      showReminderNotification();
      if (reminderEnabled) {
        startReminderTimer();
      }
    }, fiveMinutes);
  }
});