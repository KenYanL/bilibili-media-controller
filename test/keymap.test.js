import assert from 'node:assert/strict';

import { formatPlaybackRateLabel, getPlaybackRateDelta, getSubtitleStatusLabel } from '../src/keymap.js';

assert.equal(getPlaybackRateDelta({ key: '>', shiftKey: true, ctrlKey: false, metaKey: false, altKey: false }), 0.25);
assert.equal(getPlaybackRateDelta({ key: '<', shiftKey: true, ctrlKey: false, metaKey: false, altKey: false }), -0.25);
assert.equal(getPlaybackRateDelta({ key: '.', shiftKey: false, ctrlKey: false, metaKey: false, altKey: false }), null);
assert.equal(getPlaybackRateDelta({ key: '>', shiftKey: true, ctrlKey: true, metaKey: false, altKey: false }), null);
assert.equal(formatPlaybackRateLabel(1.25), '>> 1.25x');
assert.equal(getSubtitleStatusLabel({ ok: true, action: 'off' }), 'Subtitles off');
assert.equal(getSubtitleStatusLabel({ ok: true, action: 'on' }), 'Subtitles on');
assert.equal(getSubtitleStatusLabel({ ok: false, action: 'missing-subtitle' }), '没有字幕');
assert.equal(getSubtitleStatusLabel({ ok: false, action: 'missing-player' }), null);

console.log('keymap checks passed');
