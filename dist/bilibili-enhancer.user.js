// ==UserScript==
// @name         Bilibili Enhancer Lite
// @namespace    https://github.com/yanlinwang/bilibili-enhancer-lite
// @version      0.1.4
// @description  Bilibili-only subtitle toggle and lightweight media shortcuts.
// @match        https://www.bilibili.com/video/*
// @match        https://www.bilibili.com/festival/*
// @run-at       document-start
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  const BILIBILI_HOST = 'www.bilibili.com';
  const VIDEO_PATH_RE = /^\/video\//;
  const FESTIVAL_PATH_RE = /^\/festival\//;
  const HUD_ID = 'bilibili-enhancer-lite-hud';
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
  const DEFAULT_PLAYBACK_RATE = 1;
  const DEFAULT_PLAYBACK_RATE_STORAGE_KEY = 'bilibili-enhancer-lite.defaultPlaybackRate';
  const HUD_AUTO_HIDE_DELAY_MS = 300;
  let cleanupKeymap = null;
  let cleanup = null;
  let toastTimer = null;
  const globalPreferenceStore = createGlobalPreferenceStore();
  const videoInstanceState = createVideoInstanceState({ preferenceStore: globalPreferenceStore });

  if (location.hostname !== BILIBILI_HOST) return;
  if (!isBilibiliPlaybackPage(location)) return;

  function isBilibiliPlaybackPage(locationRef = window.location) {
    if (locationRef.hostname !== BILIBILI_HOST) return false;
    if (VIDEO_PATH_RE.test(locationRef.pathname)) return true;
    return FESTIVAL_PATH_RE.test(locationRef.pathname);
  }

  function ready(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
      return;
    }

    callback();
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function sanitizePlaybackRate(value) {
    const rate = Number(value);
    return Number.isFinite(rate) && rate > 0 ? rate : DEFAULT_PLAYBACK_RATE;
  }

  function createGlobalPreferenceStore(options = {}) {
    const storage = options.storage || (typeof window !== 'undefined' ? window.localStorage : null);
    const storageKey = options.storageKey || DEFAULT_PLAYBACK_RATE_STORAGE_KEY;

    function readStoredDefaultPlaybackRate() {
      if (!storage || typeof storage.getItem !== 'function') return undefined;

      try {
        const storedValue = storage.getItem(storageKey);
        return storedValue == null ? undefined : sanitizePlaybackRate(storedValue);
      } catch {
        return undefined;
      }
    }

    function persistDefaultPlaybackRate(value) {
      if (!storage || typeof storage.setItem !== 'function') return;

      try {
        storage.setItem(storageKey, String(value));
      } catch {}
    }

    let defaultPlaybackRate = sanitizePlaybackRate(options.defaultPlaybackRate ?? readStoredDefaultPlaybackRate());

    return {
      getDefaultPlaybackRate() {
        return defaultPlaybackRate;
      },
      setDefaultPlaybackRate(value) {
        defaultPlaybackRate = sanitizePlaybackRate(value);
        persistDefaultPlaybackRate(defaultPlaybackRate);
        return defaultPlaybackRate;
      }
    };
  }

  function createVideoInstanceState(options = {}) {
    const preferenceStore = options.preferenceStore || createGlobalPreferenceStore();
    const stateByMedia = new WeakMap();

    function createState() {
      return {
        playbackRate: preferenceStore.getDefaultPlaybackRate()
      };
    }

    return {
      ensure(media) {
        if (!(media instanceof HTMLMediaElement)) return null;
        if (!stateByMedia.has(media)) {
          stateByMedia.set(media, createState());
        }
        return stateByMedia.get(media);
      },
      get(media) {
        return stateByMedia.get(media) || null;
      }
    };
  }

  function clampPlaybackRate(value) {
    const rate = Number(value);
    if (!Number.isFinite(rate)) return 1;

    const alignedRate = Math.round(rate / 0.25) * 0.25;
    return Math.min(2, Math.max(0.25, alignedRate));
  }

  function createSpeedController(options = {}) {
    const mediaCore = options.mediaCore || null;
    const preferenceStore = options.preferenceStore || null;

    function getCurrentMediaState() {
      if (!mediaCore) return { media: null, state: null };

      const media = mediaCore.getMedia();
      if (!media) return { media: null, state: null };

      return {
        media,
        state: mediaCore.getVideoState()
      };
    }

    function applyPlaybackRate(media, state, value) {
      if (!media || !state) return false;

      const nextPlaybackRate = clampPlaybackRate(value);
      state.playbackRate = nextPlaybackRate;
      media.playbackRate = nextPlaybackRate;
      if (preferenceStore && typeof preferenceStore.setDefaultPlaybackRate === 'function') {
        preferenceStore.setDefaultPlaybackRate(nextPlaybackRate);
      }
      console.log('[Speed]', nextPlaybackRate);
      return nextPlaybackRate;
    }

    return {
      getPlaybackRate() {
        const { state } = getCurrentMediaState();
        return state ? state.playbackRate : null;
      },
      setPlaybackRate(value) {
        const { media, state } = getCurrentMediaState();
        return applyPlaybackRate(media, state, value);
      },
      changePlaybackRate(delta) {
        const { media, state } = getCurrentMediaState();
        if (!media || !state) return false;

        return applyPlaybackRate(media, state, state.playbackRate + delta);
      },
      syncPlaybackRate() {
        const { media, state } = getCurrentMediaState();
        return applyPlaybackRate(media, state, state ? state.playbackRate : null);
      }
    };
  }

  function getPlayerRoot(documentRef = document) {
    return documentRef.querySelector(PLAYER_ROOT_SELECTOR);
  }

  function getScopedMedia(documentRef = document, locationRef = window.location) {
    if (!isBilibiliPlaybackPage(locationRef)) return null;

    const root = getPlayerRoot(documentRef);
    if (!root) return null;

    const media = [...root.querySelectorAll('video, audio')]
      .filter(item => item instanceof HTMLMediaElement)
      .sort((a, b) => {
        const aScore = Number(!a.paused) + Number(a.currentTime > 0);
        const bScore = Number(!b.paused) + Number(b.currentTime > 0);
        return bScore - aScore;
      });

    return media[0] || null;
  }

  function createMediaCore(options = {}) {
    const documentRef = options.document || document;
    const locationRef = options.location || window.location;
    const videoState = options.videoState || null;

    function getMedia() {
      const media = getScopedMedia(documentRef, locationRef);
      if (media && videoState) {
        videoState.ensure(media);
      }
      return media;
    }

    function seekBy(seconds) {
      const media = getMedia();
      if (!media) return false;

      const duration = Number.isFinite(media.duration) ? media.duration : Infinity;
      media.currentTime = clamp(media.currentTime + seconds, 0, duration);
      return media.currentTime;
    }

    function setVolume(volume) {
      const media = getMedia();
      if (!media) return false;

      const nextVolume = Number(clamp(Number(volume), 0, 1).toFixed(2));
      if (Number.isNaN(nextVolume)) return false;

      media.volume = nextVolume;
      if (nextVolume > 0) media.muted = false;
      return nextVolume;
    }

    function changeVolume(delta) {
      const media = getMedia();
      if (!media) return false;
      return setVolume(media.volume + delta);
    }

    function togglePlay() {
      const media = getMedia();
      if (!media) return false;

      if (media.paused) {
        const playResult = media.play();
        if (playResult && typeof playResult.catch === 'function') {
          playResult.catch(() => {});
        }
        return 'play';
      }

      media.pause();
      return 'pause';
    }

    return {
      getMedia,
      seekBy,
      setVolume,
      changeVolume,
      togglePlay,
      getVideoState() {
        const media = getMedia();
        return media && videoState ? videoState.get(media) : null;
      }
    };
  }

  function isHidden(element) {
    if (!element) return true;
    const style = window.getComputedStyle(element);
    return style.display === 'none' || style.visibility === 'hidden';
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

  async function toggleSubtitle(options = {}) {
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

  function isEditableTarget(target, activeElement) {
    const element = target instanceof Element ? target : activeElement;
    if (!element) return false;

    const editable = element.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="textbox"]');
    return Boolean(editable);
  }

  function isPlainKey(event, key) {
    return !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey && event.key.toLowerCase() === key;
  }

  function getPlaybackRateDelta(event) {
    if (event.ctrlKey || event.metaKey || event.altKey || !event.shiftKey) return null;
    if (event.key === '>') return 0.25;
    if (event.key === '<') return -0.25;
    return null;
  }

  function formatPlaybackRateLabel(playbackRate) {
    return `>> ${Number(playbackRate).toFixed(2)}x`;
  }

  function consume(event) {
    event.preventDefault();
    event.stopPropagation();
  }

  function getHudRoot(documentRef = document) {
    return (
      documentRef.fullscreenElement ||
      documentRef.querySelector('.bpx-player-container') ||
      documentRef.querySelector('.bpx-player') ||
      documentRef.body
    );
  }

  function getHudScale(viewport = {}) {
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

  function initKeymap(options = {}) {
    const documentRef = options.document || document;
    const locationRef = options.location || window.location;
    const media = options.media;
    const speedController = options.speedController || null;
    const subtitleToggle = options.toggleSubtitle;
    const notify = options.notify || (() => {});

    if (!isBilibiliPlaybackPage(locationRef) || !media || !subtitleToggle) {
      return () => {};
    }

    if (cleanupKeymap) {
      cleanupKeymap();
    }

    function onKeyDown(event) {
      if (!isBilibiliPlaybackPage(locationRef)) return;
      if (event.defaultPrevented || event.repeat) return;
      if (isEditableTarget(event.target, documentRef.activeElement)) return;

      const playbackRateDelta = getPlaybackRateDelta(event);
      if (playbackRateDelta !== null && speedController) {
        const nextPlaybackRate = speedController.changePlaybackRate(playbackRateDelta);
        if (nextPlaybackRate !== false) {
          consume(event);
          notify(formatPlaybackRateLabel(nextPlaybackRate));
        }
        return;
      }

      if (isPlainKey(event, 'c')) {
        consume(event);
        subtitleToggle().then(result => {
          if (result.ok) {
            notify(result.action === 'off' ? 'Subtitles off' : 'Subtitles on');
          }
        });
        return;
      }

      if (isPlainKey(event, 'j')) {
        if (media.seekBy(-5) !== false) {
          consume(event);
          notify('-5s');
        }
        return;
      }

      if (isPlainKey(event, 'l')) {
        if (media.seekBy(5) !== false) {
          consume(event);
          notify('+5s');
        }
        return;
      }

      if (isPlainKey(event, 'k')) {
        const state = media.togglePlay();
        if (state) {
          consume(event);
          notify(state === 'play' ? 'Play' : 'Pause');
        }
        return;
      }

    }

    documentRef.addEventListener('keydown', onKeyDown);

    cleanupKeymap = () => {
      documentRef.removeEventListener('keydown', onKeyDown);
      cleanupKeymap = null;
    };

    return cleanupKeymap;
  }

  function initBilibiliEnhancer() {
    if (!isBilibiliPlaybackPage()) return;
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

  initBilibiliEnhancer();
})();
