import assert from 'node:assert/strict';

import { createGlobalPreferenceStore } from '../src/playback-speed-state.js';

function memoryStorage(entries) {
  return {
    data: new Map(entries),
    getItem(key) {
      return this.data.has(key) ? this.data.get(key) : null;
    },
    setItem(key, value) {
      this.data.set(key, value);
    },
    removeItem(key) {
      this.data.delete(key);
    }
  };
}

const storage = memoryStorage([['bilibili-enhancer-lite.defaultPlaybackRate', '1.5']]);
const preferenceStore = createGlobalPreferenceStore({ storage });

assert.equal(preferenceStore.getDefaultPlaybackRate(), 1.5);
assert.equal(preferenceStore.setDefaultPlaybackRate(1.75), 1.75);
assert.equal(storage.getItem('bilibili-enhancer-lite.defaultPlaybackRate'), '1.75');
assert.equal(storage.getItem('bilibili-enhancer-lite.playbackRateGuard'), '1');

const stuck = memoryStorage([['bilibili-enhancer-lite.defaultPlaybackRate', '1.25']]);
const recovered = createGlobalPreferenceStore({ storage: stuck });
assert.equal(recovered.getDefaultPlaybackRate(), 1);
assert.equal(stuck.getItem('bilibili-enhancer-lite.defaultPlaybackRate'), null);
assert.equal(stuck.getItem('bilibili-enhancer-lite.playbackRateGuard'), '1');
assert.equal(recovered.setDefaultPlaybackRate(1.25), 1.25);
assert.equal(createGlobalPreferenceStore({ storage: stuck }).getDefaultPlaybackRate(), 1.25);

console.log('playback-speed-state checks passed');
