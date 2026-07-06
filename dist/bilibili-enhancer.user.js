// ==UserScript==
// @name         Bilibili Enhancer Lite
// @namespace    https://github.com/yanlinwang/bilibili-enhancer-lite
// @version      0.1.0
// @description  Bilibili-only subtitle toggle and lightweight media shortcuts.
// @match        https://www.bilibili.com/video/*
// @run-at       document-start
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

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
  const DEFAULT_PLAYBACK_RATE = 1;
  let cleanupKeymap = null;
  let cleanup = null;
  let toastTimer = null;
  const globalPreferenceStore = createGlobalPreferenceStore();
  const videoInstanceState = createVideoInstanceState({ preferenceStore: globalPreferenceStore });

  if (location.hostname !== BILIBILI_HOST) return;
  if (!VIDEO_PATH_RE.test(location.pathname)) return;

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

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function sanitizePlaybackRate(value) {
    const rate = Number(value);
    return Number.isFinite(rate) && rate > 0 ? rate : DEFAULT_PLAYBACK_RATE;
  }

  function createGlobalPreferenceStore(options = {}) {
    let defaultPlaybackRate = sanitizePlaybackRate(options.defaultPlaybackRate);

    return {
      getDefaultPlaybackRate() {
        return defaultPlaybackRate;
      },
      setDefaultPlaybackRate(value) {
        defaultPlaybackRate = sanitizePlaybackRate(value);
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
    if (!isBilibiliVideoPage(locationRef)) return null;

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

  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function toggleSubtitle(options = {}) {
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

  function isEditableTarget(target, activeElement) {
    const element = target instanceof Element ? target : activeElement;
    if (!element) return false;

    const editable = element.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="textbox"]');
    return Boolean(editable);
  }

  function isPlainKey(event, key) {
    return !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey && event.key.toLowerCase() === key;
  }

  function consume(event) {
    event.preventDefault();
    event.stopPropagation();
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

  function initKeymap(options = {}) {
    const documentRef = options.document || document;
    const locationRef = options.location || window.location;
    const media = options.media;
    const subtitleToggle = options.toggleSubtitle;

    if (!isBilibiliVideoPage(locationRef) || !media || !subtitleToggle) {
      return () => {};
    }

    if (cleanupKeymap) {
      cleanupKeymap();
    }

    function onKeyDown(event) {
      if (!isBilibiliVideoPage(locationRef)) return;
      if (event.defaultPrevented || event.repeat) return;
      if (isEditableTarget(event.target, documentRef.activeElement)) return;

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
    if (!isBilibiliVideoPage()) return;
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
        toggleSubtitle: () => toggleSubtitle({ document, location })
      });
    });
  }

  initBilibiliEnhancer();
})();
