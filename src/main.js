import { createMediaCore } from './media-core.js';
import { createSpeedController } from './playback-speed-controller.js';
import { toggleSubtitle } from './bilibili-subtitle.js';
import { initKeymap } from './keymap.js';
import { createGlobalPreferenceStore, createVideoInstanceState } from './playback-speed-state.js';

const BILIBILI_HOST = 'www.bilibili.com';
const VIDEO_PATH_RE = /^\/video\//;
const HUD_ID = 'bilibili-enhancer-lite-hud';
export const HUD_AUTO_HIDE_DELAY_MS = 300;
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

function getHudRoot(documentRef = document) {
  return (
    documentRef.fullscreenElement ||
    documentRef.querySelector('.bpx-player-container') ||
    documentRef.querySelector('.bpx-player') ||
    documentRef.body
  );
}

export function getHudScale(viewport = {}) {
  const width = viewport.width ?? window.innerWidth;
  const height = viewport.height ?? window.innerHeight;
  return Math.min(width / 1920, height / 1080);
}

function mountHUD(hud, documentRef = document) {
  const root = getHudRoot(documentRef);
  if (!root || hud.parentElement === root) return;
  console.log('[Root]', root);
  root.appendChild(hud);
}

function updateHUDScale(hud) {
  const scale = getHudScale();
  hud.style.transform = `translate(-50%, -50%) scale(${scale})`;
}

function ensureHUD(documentRef = document) {
  let hud = documentRef.querySelector(`#${HUD_ID}`);
  if (!hud) {
    hud = documentRef.createElement('div');
    hud.id = HUD_ID;
    Object.assign(hud.style, {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: '999999',
      pointerEvents: 'none',
      minWidth: '220px',
      padding: '18px 28px',
      borderRadius: '8px',
      background: 'rgba(0,0,0,0.6)',
      fontSize: '48px',
      fontWeight: 'bold',
      textAlign: 'center',
      whiteSpace: 'nowrap',
      color: '#fff',
      textShadow: '0 2px 8px rgba(0,0,0,0.8)',
      boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
      opacity: '0',
      transition: 'opacity 120ms ease'
    });
  }

  mountHUD(hud, documentRef);
  updateHUDScale(hud);
  return hud;
}

function bindHUDLifecycle(hud, documentRef = document, windowRef = window) {
  const reattach = () => {
    const root = getHudRoot(documentRef);
    if (!root) return;
    if (!root.contains(hud)) {
      root.appendChild(hud);
    }
    updateHUDScale(hud);
  };

  documentRef.addEventListener('fullscreenchange', reattach);
  windowRef.addEventListener('resize', reattach);

  const observer = new MutationObserver(() => {
    reattach();
  });
  observer.observe(documentRef.body, {
    childList: true,
    subtree: true
  });

  reattach();

  return () => {
    documentRef.removeEventListener('fullscreenchange', reattach);
    windowRef.removeEventListener('resize', reattach);
    observer.disconnect();
  };
}

function notify(hud, message) {
  mountHUD(hud);
  updateHUDScale(hud);
  hud.textContent = message;
  hud.style.opacity = '1';
  console.log('[HUD]', {
    text: hud.textContent,
    opacity: hud.style.opacity,
    transform: hud.style.transform
  });
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    hud.style.opacity = '0';
  }, HUD_AUTO_HIDE_DELAY_MS);
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

    const hud = ensureHUD(document);
    const cleanupHUDLifecycle = bindHUDLifecycle(hud, document, window);
    const media = createMediaCore({
      document,
      location,
      videoState: videoInstanceState
    });
    const speedController = createSpeedController({
      mediaCore: media,
      preferenceStore: globalPreferenceStore
    });
    speedController.syncPlaybackRate();
    bindMediaLifecycleInit(media, speedController);
    cleanup = initKeymap({
      document,
      location,
      media,
      speedController,
      toggleSubtitle: () => toggleSubtitle({ document, location }),
      notify: message => notify(hud, message)
    });
    const cleanupKeymap = cleanup;
    cleanup = () => {
      cleanupHUDLifecycle();
      cleanupKeymap();
    };
  });
}

if (typeof window !== 'undefined') {
  initBilibiliEnhancer();
}
