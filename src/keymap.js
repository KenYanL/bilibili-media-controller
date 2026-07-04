const BILIBILI_HOST = 'www.bilibili.com';
const VIDEO_PATH_RE = /^\/video\//;
let cleanupKeymap = null;

function isBilibiliVideoPage(locationRef = window.location) {
  return locationRef.hostname === BILIBILI_HOST && VIDEO_PATH_RE.test(locationRef.pathname);
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

function isShiftKey(event, key, code) {
  return event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey && (event.key === key || event.code === code);
}

function consume(event) {
  event.preventDefault();
  event.stopPropagation();
}

export function initKeymap(options = {}) {
  const documentRef = options.document || document;
  const locationRef = options.location || window.location;
  const media = options.media;
  const toggleSubtitle = options.toggleSubtitle;
  const notify = options.notify || (() => {});

  if (!isBilibiliVideoPage(locationRef) || !media || !toggleSubtitle) {
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
      toggleSubtitle().then(result => {
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

    if (isShiftKey(event, '>', 'Period')) {
      const rate = media.changePlaybackRate(0.1);
      if (rate !== false) {
        consume(event);
        notify(`${rate}x`);
      }
      return;
    }

    if (isShiftKey(event, '<', 'Comma')) {
      const rate = media.changePlaybackRate(-0.1);
      if (rate !== false) {
        consume(event);
        notify(`${rate}x`);
      }
    }
  }

  documentRef.addEventListener('keydown', onKeyDown);

  cleanupKeymap = () => {
    documentRef.removeEventListener('keydown', onKeyDown);
    cleanupKeymap = null;
  };

  return cleanupKeymap;
}

