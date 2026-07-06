const MIN_PLAYBACK_RATE = 0.25;
const MAX_PLAYBACK_RATE = 2;
const PLAYBACK_RATE_STEP = 0.25;

export function clampPlaybackRate(value) {
  const rate = Number(value);
  if (!Number.isFinite(rate)) return 1;

  const alignedRate = Math.round(rate / PLAYBACK_RATE_STEP) * PLAYBACK_RATE_STEP;
  return Math.min(MAX_PLAYBACK_RATE, Math.max(MIN_PLAYBACK_RATE, alignedRate));
}

export function createSpeedController(options = {}) {
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

export const playbackSpeedControllerConfig = {
  min: MIN_PLAYBACK_RATE,
  max: MAX_PLAYBACK_RATE,
  step: PLAYBACK_RATE_STEP
};
