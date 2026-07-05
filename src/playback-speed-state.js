const DEFAULT_PLAYBACK_RATE = 1;

function sanitizePlaybackRate(value) {
  const rate = Number(value);
  return Number.isFinite(rate) && rate > 0 ? rate : DEFAULT_PLAYBACK_RATE;
}

export function createGlobalPreferenceStore(options = {}) {
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

export function createVideoInstanceState(options = {}) {
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
