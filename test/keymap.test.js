import assert from 'node:assert/strict';

import { formatPlaybackRateLabel, getPlaybackRateDelta } from '../src/keymap.js';

assert.equal(getPlaybackRateDelta({ key: '>', shiftKey: true, ctrlKey: false, metaKey: false, altKey: false }), 0.25);
assert.equal(getPlaybackRateDelta({ key: '<', shiftKey: true, ctrlKey: false, metaKey: false, altKey: false }), -0.25);
assert.equal(getPlaybackRateDelta({ key: '.', shiftKey: false, ctrlKey: false, metaKey: false, altKey: false }), null);
assert.equal(getPlaybackRateDelta({ key: '>', shiftKey: true, ctrlKey: true, metaKey: false, altKey: false }), null);
assert.equal(formatPlaybackRateLabel(1.25), '>> 1.25x');

console.log('keymap checks passed');
