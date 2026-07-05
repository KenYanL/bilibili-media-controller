const BILIBILI_HOST = 'www.bilibili.com';
const VIDEO_PATH_RE = /^\/video\//;
const PLAYER_ROOT_SELECTOR = [
  '.bpx-player-container',
  '#bilibili-player',
  '.bilibili-player',
  '.player-wrap',
  '#app'
].join(',');
const MEDIA_SELECTOR = 'video, audio';

function isBilibiliVideoPage(locationRef = window.location) {
  return locationRef.hostname === BILIBILI_HOST && VIDEO_PATH_RE.test(locationRef.pathname);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getPlayerRoot(documentRef = document) {
  return documentRef.querySelector(PLAYER_ROOT_SELECTOR);
}

function getScopedMedia(documentRef = document, locationRef = window.location) {
  if (!isBilibiliVideoPage(locationRef)) return null;

  const root = getPlayerRoot(documentRef);
  if (!root) return null;

  const media = [...root.querySelectorAll(MEDIA_SELECTOR)]
    .filter(item => item instanceof HTMLMediaElement)
    .sort((a, b) => {
      const aScore = Number(!a.paused) + Number(a.currentTime > 0);
      const bScore = Number(!b.paused) + Number(b.currentTime > 0);
      return bScore - aScore;
    });

  return media[0] || null;
}

export function createMediaCore(options = {}) {
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
