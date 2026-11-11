import { isBilibiliPlaybackPage } from './bilibili-page.js';
import { createMediaCore } from './media-core.js';
import { createSpeedController } from './playback-speed-controller.js';
import { toggleSubtitle } from './bilibili-subtitle.js';
import { initKeymap } from './keymap.js';
import { createGlobalPreferenceStore, createVideoInstanceState } from './playback-speed-state.js';

export const HUD_ID = 'bilibili-enhancer-lite-hud';
export const HUD_AUTO_HIDE_DELAY_MS = 300;
let cleanup = null;
let toastTimer = null;
const globalPreferenceStore = createGlobalPreferenceStore();
const videoInstanceState = createVideoInstanceState({ preferenceStore: globalPreferenceStore });

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
  const view = globalThis.window;
  const width = viewport.width ?? view?.innerWidth ?? 1920;
  const height = viewport.height ?? view?.innerHeight ?? 1080;
  return Math.min(width / 1920, height / 1080);
}

function mountHUD(hud, documentRef = hud.ownerDocument || globalThis.document) {
  const root = getHudRoot(documentRef);
  if (!root || hud.parentElement === root) return;
  console.log('[Root]', root);
  root.appendChild(hud);
}

function updateHUDScale(hud) {
  const scale = getHudScale();
  hud.style.transform = `translate(-50%, -50%) scale(${scale})`;
}

function setImportantStyle(style, name, value) {
  if (typeof style.setProperty === 'function') {
    style.setProperty(name, value, 'important');
    return;
  }
  const camel = name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  style[camel] = value;
}

// Keep the idle HUD out of hit-testing. opacity:0 plus pointer-events:none is
// not enough in Safari when the player stretches this node over the end-screen
// related-video grid, which can leave only the first card clickable.
export function setHudVisible(hud, visible) {
  const style = hud.style;
  style.opacity = visible ? '1' : '0';
  style.pointerEvents = 'none';
  style.visibility = visible ? 'visible' : 'hidden';
  style.width = 'auto';
  style.height = 'auto';
  style.flex = 'none';
  setImportantStyle(style, 'pointer-events', 'none');
  setImportantStyle(style, 'visibility', visible ? 'visible' : 'hidden');
  setImportantStyle(style, 'width', 'auto');
  setImportantStyle(style, 'height', 'auto');
  setImportantStyle(style, 'flex', 'none');
}

export function ensureHUD(documentRef = document) {
  let hud = documentRef.querySelector(`#${HUD_ID}`);
  if (!hud) {
    hud = documentRef.createElement('div');
    hud.id = HUD_ID;
    Object.assign(hud.style, {
      position: 'fixed',
      top: '50%',
      left: '50%',
      right: 'auto',
      bottom: 'auto',
      width: 'auto',
      height: 'auto',
      margin: '0',
      flex: 'none',
      alignSelf: 'center',
      transform: 'translate(-50%, -50%)',
      zIndex: '999999',
      pointerEvents: 'none',
      visibility: 'hidden',
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
    setHudVisible(hud, false);
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

export function notify(hud, message) {
  mountHUD(hud);
  updateHUDScale(hud);
  hud.textContent = message;
  setHudVisible(hud, true);
  console.log('[HUD]', {
    text: hud.textContent,
    opacity: hud.style.opacity,
    transform: hud.style.transform
  });
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    setHudVisible(hud, false);
  }, HUD_AUTO_HIDE_DELAY_MS);
}

export function bindMediaLifecycleInit(mediaCore, speedController, documentRef = document) {
  let activeMedia = null;
  let cleanupMedia = () => {};

  const bindMedia = () => {
    const nextMedia = mediaCore.getMedia();
    if (!nextMedia || nextMedia === activeMedia) return;

    cleanupMedia();
    activeMedia = nextMedia;
    const syncPlaybackRate = () => speedController.syncPlaybackRate();
    nextMedia.addEventListener('loadedmetadata', syncPlaybackRate, { once: true });
    nextMedia.addEventListener('playing', syncPlaybackRate);
    cleanupMedia = () => {
      nextMedia.removeEventListener('loadedmetadata', syncPlaybackRate);
      nextMedia.removeEventListener('playing', syncPlaybackRate);
    };

    if (nextMedia.readyState >= HTMLMediaElement.HAVE_METADATA) {
      syncPlaybackRate();
    }
  };

  bindMedia();
  const observer = new MutationObserver(bindMedia);
  observer.observe(documentRef.body, { childList: true, subtree: true });

  return () => {
    observer.disconnect();
    cleanupMedia();
  };
}

export function initBilibiliEnhancer() {
  if (!isBilibiliPlaybackPage(location)) return;
  if (cleanup) cleanup();

  ready(() => {
    if (!isBilibiliPlaybackPage()) return;

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
    const cleanupMediaLifecycle = bindMediaLifecycleInit(media, speedController, document);
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
      cleanupMediaLifecycle();
      cleanupKeymap();
    };
  });
}

if (typeof window !== 'undefined') {
  initBilibiliEnhancer();
}
