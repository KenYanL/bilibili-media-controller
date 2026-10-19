const DEFAULT_PLAYBACK_RATE = 1;
const DEFAULT_PLAYBACK_RATE_STORAGE_KEY = 'bilibili-enhancer-lite.defaultPlaybackRate';
const PLAYBACK_RATE_GUARD_KEY = 'bilibili-enhancer-lite.playbackRateGuard';
const STUCK_GESTURE_RATE = '1.25';

function sanitizePlaybackRate(value) {
  const rate = Number(value);
  return Number.isFinite(rate) && rate > 0 ? rate : DEFAULT_PLAYBACK_RATE;
}

export function createGlobalPreferenceStore(options = {}) {
  const storage = options.storage || (typeof window !== 'undefined' ? window.localStorage : null);
  const storageKey = options.storageKey || DEFAULT_PLAYBACK_RATE_STORAGE_KEY;

  function readStoredDefaultPlaybackRate() {
    if (!storage || typeof storage.getItem !== 'function') return undefined;

    try {
      const storedValue = storage.getItem(storageKey);
      const migrated = storage.getItem(PLAYBACK_RATE_GUARD_KEY) === '1';
      // ponytail: one-shot. Safari dblclick/zoom wrote exactly "1.25" before this guard.
      // After the flag is stored, an intentional 1.25 is kept. Other saved rates are never cleared.
      if (!migrated && storedValue === STUCK_GESTURE_RATE) {
        if (typeof storage.removeItem === 'function') storage.removeItem(storageKey);
        if (storage.getItem(storageKey) == null) persistGuardFlag();
        return undefined;
      }
      if (!migrated) persistGuardFlag();
      return storedValue == null ? undefined : sanitizePlaybackRate(storedValue);
    } catch {
      return undefined;
    }
  }

  function persistGuardFlag() {
    if (!storage || typeof storage.setItem !== 'function') return;
    try {
      storage.setItem(PLAYBACK_RATE_GUARD_KEY, '1');
    } catch {}
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
