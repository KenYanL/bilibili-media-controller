import { isBilibiliPlaybackPage } from './bilibili-page.js';

let cleanupKeymap = null;

function isEditableTarget(target, activeElement) {
  const element = target instanceof Element ? target : activeElement;
  if (!element) return false;

  const editable = element.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="textbox"]');
  return Boolean(editable);
}

function isPlainKey(event, key) {
  return !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey && event.key.toLowerCase() === key;
}

export function getPlaybackRateDelta(event) {
  if (!event || event.repeat || event.ctrlKey || event.metaKey || event.altKey || !event.shiftKey) return null;
  // Chrome reports key ">" / "<". Safari on macOS often reports the unshifted key "." / ","
  // with code Period / Comma, and may set keyCode and which to 0.
  if (event.code === 'Period' || event.key === '>' || (event.key === '.' && event.code !== 'NumpadDecimal')) return 0.25;
  if (event.code === 'Comma' || event.key === '<' || (event.key === ',' && event.code !== 'NumpadDecimal')) return -0.25;
  return null;
}

export function formatPlaybackRateLabel(playbackRate) {
  return `>> ${Number(playbackRate).toFixed(2)}x`;
}

export function getSubtitleStatusLabel(result) {
  if (result.ok) return result.action === 'off' ? 'Subtitles off' : 'Subtitles on';
  return result.action === 'missing-subtitle' ? 'No subtitles' : null;
}

function consume(event) {
  event.preventDefault();
  event.stopPropagation();
}

const SPEED_GESTURE_MS = 500;
const SPEED_GESTURE_TYPES = ['mousedown', 'touchend', 'click', 'dblclick', 'gesturestart', 'gestureend'];

export function createSpeedGestureGuard() {
  return { until: 0, lastMouseAt: 0, lastTouchAt: 0 };
}

export function noteSpeedGesture(guard, type, event = {}, now = Date.now()) {
  if (type === 'dblclick' || type === 'gesturestart' || type === 'gestureend') {
    guard.until = now + SPEED_GESTURE_MS;
    return guard;
  }

  if (type === 'click' && event.detail >= 2) {
    guard.until = now + SPEED_GESTURE_MS;
    return guard;
  }

  if (type === 'touchend') {
    if (guard.lastTouchAt && now - guard.lastTouchAt <= SPEED_GESTURE_MS) guard.until = now + SPEED_GESTURE_MS;
    guard.lastTouchAt = now;
    return guard;
  }

  // A touch tap also synthesizes mousedown. Don't count that pair as a double-click.
  if (type === 'mousedown' && !(guard.lastTouchAt && now - guard.lastTouchAt <= SPEED_GESTURE_MS + 200)) {
    if (guard.lastMouseAt && now - guard.lastMouseAt <= SPEED_GESTURE_MS) guard.until = now + SPEED_GESTURE_MS;
    guard.lastMouseAt = now;
  }

  return guard;
}

export function isAccidentalPlaybackRateEvent(event, guard, now = Date.now()) {
  // ponytail: a real Shift+. keeps code Period/Comma. Safari may still set key to "."
  // and keyCode/which to 0, so those are not a veto. The dblclick/zoom key has no
  // physical code and is dropped only while that gesture window is open.
  if (event.code === 'Period' || event.code === 'Comma') return false;
  return Boolean(guard && now < guard.until);
}

export function initKeymap(options = {}) {
  const documentRef = options.document || document;
  const locationRef = options.location || window.location;
  const media = options.media;
  const speedController = options.speedController || null;
  const toggleSubtitle = options.toggleSubtitle;
  const notify = options.notify || (() => {});

  if (!isBilibiliPlaybackPage(locationRef) || !media || !toggleSubtitle) {
    return () => {};
  }

  if (cleanupKeymap) {
    cleanupKeymap();
  }

  const speedGestureGuard = createSpeedGestureGuard();
  const onSpeedGesture = event => noteSpeedGesture(speedGestureGuard, event.type, event);

  function onKeyDown(event) {
    if (!isBilibiliPlaybackPage(locationRef)) return;
    if (event.defaultPrevented || event.repeat) return;
    if (isEditableTarget(event.target, documentRef.activeElement)) return;

    const playbackRateDelta = getPlaybackRateDelta(event);
    if (playbackRateDelta !== null && speedController) {
      if (isAccidentalPlaybackRateEvent(event, speedGestureGuard)) return;
      const nextPlaybackRate = speedController.changePlaybackRate(playbackRateDelta);
      if (nextPlaybackRate !== false) {
        consume(event);
        notify(formatPlaybackRateLabel(nextPlaybackRate));
      }
      return;
    }

    if (isPlainKey(event, 'c')) {
      consume(event);
      toggleSubtitle().then(result => {
        const message = getSubtitleStatusLabel(result);
        if (message) notify(message);
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

  for (const type of SPEED_GESTURE_TYPES) documentRef.addEventListener(type, onSpeedGesture, true);
  documentRef.addEventListener('keydown', onKeyDown);

  cleanupKeymap = () => {
    for (const type of SPEED_GESTURE_TYPES) documentRef.removeEventListener(type, onSpeedGesture, true);
    documentRef.removeEventListener('keydown', onKeyDown);
    cleanupKeymap = null;
  };

  return cleanupKeymap;
}
