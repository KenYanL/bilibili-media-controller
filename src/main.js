import { createMediaCore } from './media-core.js';
import { createSpeedController } from './playback-speed-controller.js';
import { toggleSubtitle } from './bilibili-subtitle.js';
import { initKeymap } from './keymap.js';
import { createGlobalPreferenceStore, createVideoInstanceState } from './playback-speed-state.js';

const BILIBILI_HOST = 'www.bilibili.com';
const VIDEO_PATH_RE = /^\/video\//;
let cleanup = null;
let toastTimer = null;
const globalPreferenceStore = createGlobalPreferenceStore();
const videoInstanceState = createVideoInstanceState({ preferenceStore: globalPreferenceStore });

function isBilibiliVideoPage(locationRef = window.location) {
  return locationRef.hostname === BILIBILI_HOST && VIDEO_PATH_RE.test(locationRef.pathname);
}

function ready(callback) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback, { once: true });
    return;
  }

  callback();
}

function notify(message) {
  let toast = document.querySelector('#bilibili-enhancer-lite-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'bilibili-enhancer-lite-toast';
    Object.assign(toast.style, {
      position: 'fixed',
      left: '50%',
      top: '18%',
      zIndex: '2147483647',
      transform: 'translateX(-50%)',
      padding: '6px 10px',
      borderRadius: '6px',
      background: 'rgba(0, 0, 0, 0.72)',
      color: '#fff',
      fontSize: '13px',
      lineHeight: '18px',
      pointerEvents: 'none',
      opacity: '0',
      transition: 'opacity 120ms ease'
    });
    document.documentElement.appendChild(toast);
  }

  toast.textContent = message;
  toast.style.opacity = '1';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.style.opacity = '0';
  }, 800);
}

function bindMediaLifecycleInit(mediaCore, speedController) {
  const activeMedia = mediaCore.getMedia();
  if (!activeMedia) return;

  if (activeMedia.readyState >= HTMLMediaElement.HAVE_METADATA) {
    speedController.syncPlaybackRate();
    return;
  }

  activeMedia.addEventListener('loadedmetadata', () => {
    speedController.syncPlaybackRate();
  }, { once: true });
}

export function initBilibiliEnhancer() {
  if (location.hostname !== BILIBILI_HOST) return;
  if (!VIDEO_PATH_RE.test(location.pathname)) return;
  if (cleanup) cleanup();

  ready(() => {
    if (!isBilibiliVideoPage()) return;

    const media = createMediaCore({
      document,
      location,
      videoState: videoInstanceState
    });
    const speedController = createSpeedController({ mediaCore: media });
    speedController.syncPlaybackRate();
    bindMediaLifecycleInit(media, speedController);
    cleanup = initKeymap({
      document,
      location,
      media,
      toggleSubtitle: () => toggleSubtitle({ document, location }),
      notify
    });
  });
}

if (typeof window !== 'undefined') {
  initBilibiliEnhancer();
}
