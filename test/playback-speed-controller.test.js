import assert from 'node:assert/strict';

import { clampPlaybackRate, createSpeedController, playbackSpeedControllerConfig } from '../src/playback-speed-controller.js';

assert.equal(clampPlaybackRate(0), playbackSpeedControllerConfig.min);
assert.equal(clampPlaybackRate(0.37), 0.25);
assert.equal(clampPlaybackRate(1.12), 1);
assert.equal(clampPlaybackRate(1.38), 1.5);
assert.equal(clampPlaybackRate(99), playbackSpeedControllerConfig.max);

const media = { playbackRate: 1 };
const state = { playbackRate: 1 };
const preferenceStore = {
  defaultPlaybackRate: 1,
  setDefaultPlaybackRate(value) {
    this.defaultPlaybackRate = value;
    return value;
  }
};
const speedController = createSpeedController({
  mediaCore: {
    getMedia() {
      return media;
    },
    getVideoState() {
      return state;
    }
  },
  preferenceStore
});

assert.equal(speedController.changePlaybackRate(0.25), 1.25);
assert.equal(media.playbackRate, 1.25);
assert.equal(state.playbackRate, 1.25);
assert.equal(preferenceStore.defaultPlaybackRate, 1.25);

console.log('playback-speed-controller checks passed');
