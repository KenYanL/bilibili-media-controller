import assert from 'node:assert/strict';

import { createGlobalPreferenceStore } from '../src/playback-speed-state.js';

const storage = {
  data: new Map([['bilibili-enhancer-lite.defaultPlaybackRate', '1.5']]),
  getItem(key) {
    return this.data.has(key) ? this.data.get(key) : null;
  },
  setItem(key, value) {
    this.data.set(key, value);
  }
};

const preferenceStore = createGlobalPreferenceStore({ storage });

assert.equal(preferenceStore.getDefaultPlaybackRate(), 1.5);
assert.equal(preferenceStore.setDefaultPlaybackRate(1.75), 1.75);
assert.equal(storage.getItem('bilibili-enhancer-lite.defaultPlaybackRate'), '1.75');

console.log('playback-speed-state checks passed');
