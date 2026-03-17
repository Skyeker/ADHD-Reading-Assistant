// ==================== 全局变量 ====================
let highlights = [];                 // 存储手动高亮（用于未来保存）
let adhdStyleId = 'adhd-custom-style'; // 注入的style元素ID
let currentTheme = 'cream';           // 当前主题
let guideLine = null;                 // 文本指引线元素
let guideLineEnabled = false;         // 指引线启用状态
let focusModeEnabled = false;         // 专注模式启用状态
let fontSize = 16;                    // 字体大小（px）
let lineHeight = 1.6;                 // 行间距

// ==================== 初始化 ====================
chrome.storage.local.get(['highlights', 'adhdTheme', 'fontSize', 'lineHeight'], (result) => {
  if (result.highlights) {
    highlights = result.highlights;
    // 恢复高亮（简化版，如需完整恢复需遍历DOM匹配文本，暂不实现）
  }
  if (result.adhdTheme) {
    currentTheme = result.adhdTheme;
    applyADHDFormat(currentTheme); // 自动应用保存的主题
  }
  if (result.fontSize) {
    fontSize = result.fontSize;
  }
  if (result.lineHeight) {
    lineHeight = result.lineHeight;
  }
  // 应用字体和行间距设置
  applyTypographySettings();
});

// ==================== 消息监听 ====================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('content.js 收到消息:', request);
  switch (request.action) {
    case 'highlight':
      highlightSelectedText(request.style);
      break;
    case 'applyADHD':
      applyADHDFormat(request.theme);
      chrome.storage.local.set({ adhdTheme: request.theme });
      sendResponse({ success: true });
      break;
    case 'removeADHD':
      removeADHDFormat();
      chrome.storage.local.remove('adhdTheme');
      sendResponse({ success: true });
      break;
    case 'getHighlights':
      sendResponse({ highlights: highlights });
      break;
    case 'clearPageHighlights':
      clearPageHighlights();
      break;
    case 'clearAllHighlights':
      highlights = [];
      chrome.storage.local.set({ highlights: [] });
      removeAllHighlightsFromDOM();
      break;
    case 'toggleGuideLine':
      toggleGuideLine();
      sendResponse({ enabled: guideLineEnabled });
      break;
    case 'toggleFocusMode':
      toggleFocusMode();
      sendResponse({ enabled: focusModeEnabled });
      break;
    case 'updateFontSize':
      fontSize = request.size;
      chrome.storage.local.set({ fontSize: fontSize });
      applyTypographySettings();
      sendResponse({ success: true });
      break;
    case 'updateLineHeight':
      lineHeight = request.height;
      chrome.storage.local.set({ lineHeight: lineHeight });
      applyTypographySettings();
      sendResponse({ success: true });
      break;
    case 'textToSpeech':
      speakSelectedText();
      sendResponse({ success: true });
      break;
  }
  return true;
});

// ==================== 手动高亮功能 ====================
const styleConfig = {
  // 背景色
  'red-bg':   { backgroundColor: '#ffcccc', borderLeft: '3px solid #ff6666' },
  'yellow-bg':{ backgroundColor: '#ffff99', borderLeft: '3px solid #ffcc00' },
  'blue-bg':  { backgroundColor: '#cce5ff', borderLeft: '3px solid #3399ff' },
  // 文字样式
  'bold':     { fontWeight: 'bold' },
  'underline':{ textDecoration: 'underline' },
  'red-text': { color: '#cc0000', fontWeight: 'bold' },
  // 组合样式（可以额外添加）
};

function highlightSelectedText(style) {
  const selection = window.getSelection();
  if (!selection.rangeCount) return;

  const range = selection.getRangeAt(0);
  const selectedText = range.toString().trim();
  if (!selectedText) return;

  const span = document.createElement('span');
  span.className = 'adhd-manual-highlight';
  
  // 应用对应的样式
  const cfg = styleConfig[style];
  if (cfg) {
    Object.assign(span.style, cfg);
  }
  
  // 添加基础样式（圆角、内边距）
  span.style.padding = '2px 4px';
  span.style.borderRadius = '3px';
  span.style.display = 'inline-block';

  try {
    range.surroundContents(span);
    
    const highlightInfo = {
      id: Date.now() + Math.random(),
      text: selectedText,
      style: style,
      xpath: getXPath(span) // 简化版，未完全实现
    };
    highlights.push(highlightInfo);
    chrome.storage.local.set({ highlights: highlights });
  } catch (e) {
    console.log('高亮失败，可能跨节点', e);
  }
}

// 获取XPath（简化版，用于后续恢复，此处暂不实现完整恢复）
function getXPath(element) {
  if (element.id) return '//*[@id="' + element.id + '"]';
  if (element === document.body) return '/html/body';
  
  let ix = 0;
  const siblings = element.parentNode.childNodes;
  for (let i = 0; i < siblings.length; i++) {
    const sibling = siblings[i];
    if (sibling === element) {
      return getXPath(element.parentNode) + '/' + element.tagName.toLowerCase() + '[' + (ix + 1) + ']';
    }
    if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
      ix++;
    }
  }
}

// 清除当前页面的所有手动高亮（仅移除span，保留文字）
function clearPageHighlights() {
  document.querySelectorAll('span.adhd-manual-highlight').forEach(span => {
    const parent = span.parentNode;
    while (span.firstChild) {
      parent.insertBefore(span.firstChild, span);
    }
    parent.removeChild(span);
  });
  // 不清除存储，只是视觉上移除
}

// 从DOM移除所有高亮（用于清除全部时）
function removeAllHighlightsFromDOM() {
  document.querySelectorAll('span.adhd-manual-highlight').forEach(span => {
    const parent = span.parentNode;
    while (span.firstChild) {
      parent.insertBefore(span.firstChild, span);
    }
    parent.removeChild(span);
  });
}

// ==================== ADHD一键格式化功能 ====================
const themeStyles = {
  cream: {
    bodyBg: '#fef9e7',
    textColor: '#2c3e50',
    linkColor: '#1a5276',
    borderColor: '#d4ac6e',
    highlightBg: '#ffffb3',
    highlightText: '#000',
    highlightWeight: 'bold',
    highlightUnderline: '2px solid #ffaa00',
    maxWidth: '800px',
    lineHeight: '1.6'
  },
  softBlue: {
    bodyBg: '#e8f0fe',
    textColor: '#1e2b3c',
    linkColor: '#1f618d',
    borderColor: '#a9cce3',
    highlightBg: '#d4e6f1',
    highlightText: '#1b4f72',
    highlightWeight: 'bold',
    highlightUnderline: '2px solid #5dade2',
    maxWidth: '800px',
    lineHeight: '1.6'
  },
  lightGreen: {
    bodyBg: '#eaf7e1',
    textColor: '#1d3b1d',
    linkColor: '#196f3d',
    borderColor: '#a9d18e',
    highlightBg: '#d5f0c5',
    highlightText: '#145a32',
    highlightWeight: 'bold',
    highlightUnderline: '2px solid #6b8e4c',
    maxWidth: '800px',
    lineHeight: '1.6'
  },
  lavender: {
    bodyBg: '#f3e5f5',
    textColor: '#4a148c',
    linkColor: '#6a1b9a',
    borderColor: '#ce93d8',
    highlightBg: '#e1bee7',
    highlightText: '#4a148c',
    highlightWeight: 'bold',
    highlightUnderline: '2px solid #ab47bc',
    maxWidth: '800px',
    lineHeight: '1.6'
  },
  softYellow: {
    bodyBg: '#fff9c4',
    textColor: '#f57f17',
    linkColor: '#e65100',
    borderColor: '#ffcc80',
    highlightBg: '#fff3e0',
    highlightText: '#ef6c00',
    highlightWeight: 'bold',
    highlightUnderline: '2px solid #ff9800',
    maxWidth: '800px',
    lineHeight: '1.6'
  },
  mint: {
    bodyBg: '#e0f2f1',
    textColor: '#00695c',
    linkColor: '#004d40',
    borderColor: '#80cbc4',
    highlightBg: '#b2dfdb',
    highlightText: '#004d40',
    highlightWeight: 'bold',
    highlightUnderline: '2px solid #26a69a',
    maxWidth: '800px',
    lineHeight: '1.6'
  }
};

function applyADHDFormat(themeName) {
  removeADHDFormat();
  
  const theme = themeStyles[themeName] || themeStyles.cream;
  const style = document.createElement('style');
  style.id = adhdStyleId;
  
  style.textContent = `
    /* ADHD 阅读模式 - 增强版 */
    html, body, body * {
      background-color: ${theme.bodyBg} !important;
      color: ${theme.textColor} !important;
      border-color: ${theme.borderColor} !important;
      box-shadow: none !important;
      text-shadow: none !important;
    }
    /* 所有文字加粗到半粗 */
    body, p, li, div, span, a, h1, h2, h3, h4, h5, h6, td, th, dt, dd {
      font-weight: 600 !important;
    }
    /* 标题、强调标签加粗到800 */
    h1, h2, h3, h4, h5, h6, strong, b, th, dt {
      font-weight: 800 !important;
    }
    /* 链接添加下划线 */
    a {
      color: ${theme.linkColor} !important;
      text-decoration: underline !important;
      font-weight: 500 !important;
    }
    /* 手动高亮不受覆盖，并保持自定义样式 */
    .adhd-manual-highlight {
      display: inline-block !important;
      padding: 2px 4px !important;
      border-radius: 3px !important;
    }
    /* 去除背景图片 */
    body {
      background-image: none !important;
    }
    /* 设置最大宽度和行高 */
    body {
      max-width: ${theme.maxWidth} !important;
      margin: 0 auto !important;
      line-height: ${theme.lineHeight} !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
    }
  `;
  
  document.head.appendChild(style);
  
  // 自动ADHD化：将页面文字大写加粗
  convertTextToADHDFormat();
  
  console.log('ADHD模式已应用，主题：', themeName);
}

// ==================== 自动ADHD化功能 ====================
function convertTextToADHDFormat() {
  // 选择所有文本节点
  const textNodes = getTextNodes(document.body);
  
  textNodes.forEach(node => {
    // 跳过已经处理过的节点和空节点
    if (node.parentElement.classList.contains('adhd-processed') || !node.textContent.trim()) {
      return;
    }
    
    // 智能处理文本，根据ADHD习惯强调重要内容
    const processedText = processTextForADHD(node.textContent);
    
    // 创建新的span元素
    const span = document.createElement('span');
    span.className = 'adhd-processed';
    
    // 设置处理后的HTML内容
    span.innerHTML = processedText;
    
    // 替换原始文本节点
    node.parentNode.replaceChild(span, node);
  });
}

// 根据ADHD习惯处理文本
function processTextForADHD(text) {
  // 分割文本为单词
  const words = text.split(/\s+/);
  
  // 处理每个单词
  const processedWords = words.map(word => {
    // 跳过空单词
    if (!word) return word;
    
    // 处理数字和日期
    if (/^\d+([./-]\d+)*$/.test(word)) {
      return `<strong>${word}</strong>`;
    }
    
    // 处理短单词（2-3个字母）- 全部大写
    if (word.length >= 2 && word.length <= 3) {
      return `<strong>${word.toUpperCase()}</strong>`;
    }
    
    // 处理长单词 - 首字母大写，中间随机字母加粗
    if (word.length > 3) {
      let processedWord = '';
      for (let i = 0; i < word.length; i++) {
        // 首字母大写
        if (i === 0) {
          processedWord += `<strong>${word[i].toUpperCase()}</strong>`;
        } 
        // 随机选择一些字母加粗（约30%的概率）
        else if (Math.random() < 0.3) {
          processedWord += `<strong>${word[i]}</strong>`;
        } 
        // 其他字母保持原样
        else {
          processedWord += word[i];
        }
      }
      return processedWord;
    }
    
    // 其他情况保持原样
    return word;
  });
  
  // 重新组合单词
  return processedWords.join(' ');
}

// 获取所有文本节点
function getTextNodes(element) {
  const textNodes = [];
  
  function traverse(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      textNodes.push(node);
    } else {
      // 跳过script和style标签
      if (node.tagName !== 'SCRIPT' && node.tagName !== 'STYLE') {
        for (let i = 0; i < node.childNodes.length; i++) {
          traverse(node.childNodes[i]);
        }
      }
    }
  }
  
  traverse(element);
  return textNodes;
}

function removeADHDFormat() {
  const existing = document.getElementById(adhdStyleId);
  if (existing) existing.remove();
  
  // 移除自动ADHD化的效果
  const processedElements = document.querySelectorAll('.adhd-processed');
  processedElements.forEach(element => {
    // 将span元素的内容还原为原始文本
    const textNode = document.createTextNode(element.textContent);
    element.parentNode.replaceChild(textNode, element);
  });
}

// ==================== 文本指引线功能 ====================
function toggleGuideLine() {
  if (guideLineEnabled) {
    removeGuideLine();
  } else {
    createGuideLine();
  }
  guideLineEnabled = !guideLineEnabled;
}

function createGuideLine() {
  if (guideLine) return;
  
  guideLine = document.createElement('div');
  guideLine.id = 'adhd-guide-line';
  guideLine.style.position = 'fixed';
  guideLine.style.top = '0';
  guideLine.style.left = '0';
  guideLine.style.width = '100vw';
  guideLine.style.height = '20px';
  guideLine.style.display = 'flex';
  guideLine.style.alignItems = 'center';
  guideLine.style.zIndex = '999999';
  guideLine.style.pointerEvents = 'none';
  guideLine.style.transition = 'top 0.1s ease';
  
  // 创建括号标志
  const leftBracket = document.createElement('div');
  leftBracket.style.fontSize = '24px';
  leftBracket.style.fontWeight = 'bold';
  leftBracket.style.color = 'rgba(74, 144, 226, 0.7)';
  leftBracket.style.marginLeft = '20px';
  leftBracket.textContent = '[';
  
  const rightBracket = document.createElement('div');
  rightBracket.style.fontSize = '24px';
  rightBracket.style.fontWeight = 'bold';
  rightBracket.style.color = 'rgba(74, 144, 226, 0.7)';
  rightBracket.style.marginRight = '20px';
  rightBracket.textContent = ']';
  
  const line = document.createElement('div');
  line.style.flexGrow = '1';
  line.style.height = '2px';
  line.style.backgroundColor = 'rgba(74, 144, 226, 0.7)';
  
  guideLine.appendChild(leftBracket);
  guideLine.appendChild(line);
  guideLine.appendChild(rightBracket);
  
  document.body.appendChild(guideLine);
  
  // 添加鼠标移动事件监听
  document.addEventListener('mousemove', updateGuideLinePosition);
  document.addEventListener('scroll', updateGuideLinePosition);
}

function removeGuideLine() {
  if (guideLine) {
    guideLine.remove();
    guideLine = null;
    document.removeEventListener('mousemove', updateGuideLinePosition);
    document.removeEventListener('scroll', updateGuideLinePosition);
  }
}

function updateGuideLinePosition(e) {
  if (!guideLine) return;
  
  let y = 0;
  if (e.type === 'mousemove') {
    y = e.clientY - 10; // 调整为指引线的中心位置
  } else {
    // 滚动时，将指引线保持在视口中央
    y = window.innerHeight / 2 + window.scrollY - 10; // 调整为指引线的中心位置
  }
  
  guideLine.style.top = y + 'px';
  console.log('指引线位置更新:', y);
}

// ==================== 专注模式功能 ====================
function toggleFocusMode() {
  if (focusModeEnabled) {
    disableFocusMode();
  } else {
    enableFocusMode();
  }
  focusModeEnabled = !focusModeEnabled;
}

function enableFocusMode() {
  // 创建专注模式样式
  const focusStyle = document.createElement('style');
  focusStyle.id = 'adhd-focus-style';
  
  focusStyle.textContent = `
    /* 专注模式样式 */
    body *:not(:hover) {
      opacity: 0.3 !important;
      transition: opacity 0.3s ease !important;
    }
    
    body *:hover {
      opacity: 1 !important;
      transition: opacity 0.3s ease !important;
    }
    
    /* 确保手动高亮不受影响 */
    .adhd-manual-highlight {
      opacity: 1 !important;
    }
  `;
  
  document.head.appendChild(focusStyle);
}

function disableFocusMode() {
  const focusStyle = document.getElementById('adhd-focus-style');
  if (focusStyle) {
    focusStyle.remove();
  }
}

// ==================== 字体和行间距设置 ====================
function applyTypographySettings() {
  // 移除现有的排版样式
  const existingStyle = document.getElementById('adhd-typography-style');
  if (existingStyle) {
    existingStyle.remove();
  }
  
  // 创建新的排版样式
  const typographyStyle = document.createElement('style');
  typographyStyle.id = 'adhd-typography-style';
  
  typographyStyle.textContent = `
    /* 字体大小和行间距设置 */
    body, p, li, div, span, a, h1, h2, h3, h4, h5, h6, td, th, dt, dd {
      font-size: ${fontSize}px !important;
      line-height: ${lineHeight} !important;
    }
    
    /* 标题字体大小调整 */
    h1 { font-size: ${fontSize * 2}px !important; }
    h2 { font-size: ${fontSize * 1.5}px !important; }
    h3 { font-size: ${fontSize * 1.2}px !important; }
    h4, h5, h6 { font-size: ${fontSize}px !important; }
  `;
  
  document.head.appendChild(typographyStyle);
}

// ==================== 文本转语音功能 ====================
function speakSelectedText() {
  const selection = window.getSelection();
  if (!selection.rangeCount) {
    alert('请先选中要朗读的文字');
    return;
  }
  
  const selectedText = selection.toString().trim();
  if (!selectedText) {
    alert('请选中要朗读的文字');
    return;
  }
  
  // 检查浏览器是否支持语音合成
  if ('speechSynthesis' in window) {
    // 停止当前正在播放的语音
    window.speechSynthesis.cancel();
    
    // 创建语音实例
    const speech = new SpeechSynthesisUtterance(selectedText);
    
    // 设置语音参数
    speech.lang = 'zh-CN'; // 使用中文语音
    speech.rate = 1;        // 语速
    speech.pitch = 1;       // 音调
    speech.volume = 1;      // 音量
    
    // 开始朗读
    window.speechSynthesis.speak(speech);
  } else {
    alert('您的浏览器不支持文本转语音功能');
  }
}