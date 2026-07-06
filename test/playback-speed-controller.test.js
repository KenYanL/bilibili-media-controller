import assert from 'node:assert/strict';

import { clampPlaybackRate, playbackSpeedControllerConfig } from '../src/playback-speed-controller.js';

assert.equal(clampPlaybackRate(0), playbackSpeedControllerConfig.min);
assert.equal(clampPlaybackRate(0.37), 0.25);
assert.equal(clampPlaybackRate(1.12), 1);
assert.equal(clampPlaybackRate(1.38), 1.5);
assert.equal(clampPlaybackRate(99), playbackSpeedControllerConfig.max);

console.log('playback-speed-controller checks passed');
