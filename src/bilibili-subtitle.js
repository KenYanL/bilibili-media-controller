import { isBilibiliPlaybackPage } from './bilibili-page.js';

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
const SUBTITLE_CLOSE_SELECTOR = '.bpx-player-ctrl-subtitle-close-switch[data-action="close"], .bpx-player-ctrl-subtitle-close-switch';
const SUBTITLE_RENDER_SELECTOR = [
  '.bpx-player-subtitle-wrap',
  '.bili-subtitle-x-subtitle-panel'
].join(',');
const SUBTITLE_HIDDEN_DATA_KEY = 'bilibiliEnhancerSubtitleHidden';

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

function getSubtitleCloseButton(root) {
  return root.querySelector(SUBTITLE_CLOSE_SELECTOR);
}

function toggleRenderedSubtitle(root) {
  const subtitleRoots = [...root.querySelectorAll(SUBTITLE_RENDER_SELECTOR)];
  if (!subtitleRoots.length) return null;

  const dataset = root.dataset || {};
  const shouldHide = dataset[SUBTITLE_HIDDEN_DATA_KEY] !== 'true';
  subtitleRoots.forEach(element => {
    element.style.visibility = shouldHide ? 'hidden' : '';
  });
  dataset[SUBTITLE_HIDDEN_DATA_KEY] = shouldHide ? 'true' : 'false';
  return shouldHide ? 'off' : 'on';
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function toggleSubtitle(options = {}) {
  const documentRef = options.document || document;
  const locationRef = options.location || window.location;

  if (!isBilibiliPlaybackPage(locationRef)) {
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
  const closeButton = getSubtitleCloseButton(root);
  const preferredLangItem = root.querySelector([
    '.bpx-player-ctrl-subtitle-language-item[data-lan="ai-zh"]',
    '.bpx-player-ctrl-subtitle-language-item[data-lan="zh-CN"]',
    '.bpx-player-ctrl-subtitle-language-item[data-lan^="zh"]'
  ].join(','));
  const firstLangItem = root.querySelector('.bpx-player-ctrl-subtitle-language-item[data-lan]');

  if (activeLangItem) {
    if (!closeButton) {
      const action = toggleRenderedSubtitle(root);
      return action ? { ok: true, action } : { ok: false, action: 'missing-subtitle-renderer' };
    }

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
