const BILIBILI_HOST = 'www.bilibili.com';
const VIDEO_PATH_RE = /^\/video\//;
const PLAYER_ROOT_SELECTOR = [
  '.bpx-player-container',
  '#bilibili-player',
  '.bilibili-player',
  '.player-wrap',
  '#app'
].join(',');
const SUBTITLE_BUTTON_SELECTOR = [
  '.bpx-player-ctrl-subtitle > button',
  '.bpx-player-ctrl-btn[aria-label*="字幕"]',
  '.bpx-player-ctrl-btn[aria-label*="CC"]',
  '.squirtle-subtitle-wrap > button',
  '.bpui-btn[title*="字幕"]'
].join(',');

function isBilibiliVideoPage(locationRef = window.location) {
  return locationRef.hostname === BILIBILI_HOST && VIDEO_PATH_RE.test(locationRef.pathname);
}

function isHidden(element) {
  if (!element) return true;
  const style = window.getComputedStyle(element);
  return style.display === 'none' || style.visibility === 'hidden';
}

function getPlayerRoot(documentRef = document) {
  return documentRef.querySelector(PLAYER_ROOT_SELECTOR);
}

function clickSubtitleMenu(root) {
  const button = root.querySelector(SUBTITLE_BUTTON_SELECTOR);
  const menu = root.querySelector('.bpx-player-ctrl-subtitle') || button;

  if (!menu) return false;
  menu.click();
  return true;
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function toggleSubtitle(options = {}) {
  const documentRef = options.document || document;
  const locationRef = options.location || window.location;

  if (!isBilibiliVideoPage(locationRef)) {
    return { ok: false, action: 'ignored' };
  }

  const root = getPlayerRoot(documentRef);
  if (!root) {
    return { ok: false, action: 'missing-player' };
  }

  const panel = root.querySelector('.bpx-player-ctrl-subtitle-box');
  if (!panel || isHidden(panel)) {
    if (!clickSubtitleMenu(root)) {
      return { ok: false, action: 'missing-subtitle-menu' };
    }
    await wait(150);
  }

  const activeLangItem = root.querySelector('.bpx-player-ctrl-subtitle-language-item.bpx-state-active');
  const closeButton = root.querySelector('.bpx-player-ctrl-subtitle-close-switch[data-action="close"], .bpx-player-ctrl-subtitle-close-switch');
  const preferredLangItem = root.querySelector([
    '.bpx-player-ctrl-subtitle-language-item[data-lan="ai-zh"]',
    '.bpx-player-ctrl-subtitle-language-item[data-lan="zh-CN"]',
    '.bpx-player-ctrl-subtitle-language-item[data-lan^="zh"]'
  ].join(','));
  const firstLangItem = root.querySelector('.bpx-player-ctrl-subtitle-language-item[data-lan]');

  if (activeLangItem && closeButton) {
    closeButton.click();
    return { ok: true, action: 'off' };
  }

  const langItem = preferredLangItem || firstLangItem;
  if (langItem) {
    langItem.click();
    return { ok: true, action: 'on' };
  }

  return { ok: false, action: 'missing-language' };
}

