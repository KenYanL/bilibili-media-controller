import assert from 'node:assert/strict';

import {
  createSpeedGestureGuard,
  formatPlaybackRateLabel,
  getPlaybackRateDelta,
  getSubtitleStatusLabel,
  initKeymap,
  isAccidentalPlaybackRateEvent,
  noteSpeedGesture
} from '../src/keymap.js';

assert.equal(getPlaybackRateDelta({ key: '>', shiftKey: true, ctrlKey: false, metaKey: false, altKey: false }), 0.25);
assert.equal(getPlaybackRateDelta({ key: '<', shiftKey: true, ctrlKey: false, metaKey: false, altKey: false }), -0.25);
assert.equal(getPlaybackRateDelta({ key: '.', shiftKey: false, ctrlKey: false, metaKey: false, altKey: false }), null);
assert.equal(getPlaybackRateDelta({ key: '>', shiftKey: true, ctrlKey: true, metaKey: false, altKey: false }), null);
assert.equal(formatPlaybackRateLabel(1.25), '>> 1.25x');
assert.equal(getSubtitleStatusLabel({ ok: true, action: 'off' }), 'Subtitles off');
assert.equal(getSubtitleStatusLabel({ ok: true, action: 'on' }), 'Subtitles on');
assert.equal(getSubtitleStatusLabel({ ok: false, action: 'missing-subtitle' }), 'No subtitles');
assert.equal(getSubtitleStatusLabel({ ok: false, action: 'missing-player' }), null);

const modifiers = { shiftKey: true, ctrlKey: false, altKey: false, metaKey: false, repeat: false };
// Chrome keydown for the physical period/comma keys.
const chromeShiftPeriod = { ...modifiers, key: '>', code: 'Period', keyCode: 190, which: 190 };
const chromeShiftComma = { ...modifiers, key: '<', code: 'Comma', keyCode: 188, which: 188 };
// Safari macOS often keeps the unshifted key and reports legacy keyCode/which as 0.
const safariShiftPeriod = { ...modifiers, key: '.', code: 'Period', keyCode: 0, which: 0 };
const safariShiftComma = { ...modifiers, key: ',', code: 'Comma', keyCode: 0, which: 0 };
const safariShiftPeriodGreater = { ...modifiers, key: '>', code: 'Period', keyCode: 0, which: 0 };
// Double-click/zoom synthesizes ">" with no physical code.
const safariZoomKey = { ...modifiers, key: '>', code: '', keyCode: 0, which: 0 };
const safariZoomKeyUnidentified = { ...modifiers, key: '>', code: 'Unidentified', keyCode: 0, which: 0 };

for (const event of [chromeShiftPeriod, safariShiftPeriod, safariShiftPeriodGreater]) {
  assert.equal(getPlaybackRateDelta(event), 0.25);
}
for (const event of [chromeShiftComma, safariShiftComma]) {
  assert.equal(getPlaybackRateDelta(event), -0.25);
}
assert.equal(getPlaybackRateDelta({ ...safariShiftPeriod, shiftKey: false }), null);

const idle = createSpeedGestureGuard();
for (const event of [chromeShiftPeriod, safariShiftPeriod, safariShiftComma, safariShiftPeriodGreater]) {
  assert.equal(isAccidentalPlaybackRateEvent(event, idle, 1000), false);
}

const zooming = createSpeedGestureGuard();
noteSpeedGesture(zooming, 'dblclick', {}, 1000);
for (const event of [chromeShiftPeriod, safariShiftPeriod, safariShiftPeriodGreater, chromeShiftComma, safariShiftComma]) {
  assert.equal(isAccidentalPlaybackRateEvent(event, zooming, 1100), false);
}
assert.equal(isAccidentalPlaybackRateEvent(safariZoomKey, zooming, 1100), true);
assert.equal(isAccidentalPlaybackRateEvent(safariZoomKeyUnidentified, zooming, 1100), true);
assert.equal(isAccidentalPlaybackRateEvent(safariZoomKey, zooming, 1000 + 500), false);
assert.equal(isAccidentalPlaybackRateEvent(safariZoomKey, idle, 1100), false);

const taps = createSpeedGestureGuard();
noteSpeedGesture(taps, 'touchend', {}, 2000);
noteSpeedGesture(taps, 'mousedown', {}, 2010);
assert.equal(isAccidentalPlaybackRateEvent(safariZoomKey, taps, 2020), false);
noteSpeedGesture(taps, 'touchend', {}, 2300);
assert.equal(isAccidentalPlaybackRateEvent(safariZoomKey, taps, 2310), true);
assert.equal(isAccidentalPlaybackRateEvent(safariShiftPeriod, taps, 2310), false);

const pinch = createSpeedGestureGuard();
noteSpeedGesture(pinch, 'gesturestart', {}, 3000);
assert.equal(isAccidentalPlaybackRateEvent(safariZoomKey, pinch, 3100), true);
assert.equal(isAccidentalPlaybackRateEvent(chromeShiftPeriod, pinch, 3100), false);
const secondClick = createSpeedGestureGuard();
noteSpeedGesture(secondClick, 'click', { detail: 1 }, 4000);
assert.equal(isAccidentalPlaybackRateEvent(safariZoomKey, secondClick, 4010), false);
noteSpeedGesture(secondClick, 'click', { detail: 2 }, 4200);
assert.equal(isAccidentalPlaybackRateEvent(safariZoomKey, secondClick, 4210), true);

globalThis.Element = class Element {};
const listeners = [];
const documentRef = {
  activeElement: null,
  addEventListener(type, fn, capture) {
    listeners.push({ type, fn, capture });
  },
  removeEventListener(type, fn, capture) {
    const index = listeners.findIndex(item => item.type === type && item.fn === fn && item.capture === capture);
    if (index >= 0) listeners.splice(index, 1);
  }
};
let changed = 0;
let notice = '';
const cleanup = initKeymap({
  document: documentRef,
  location: { hostname: 'www.bilibili.com', pathname: '/video/BV1' },
  media: {
    seekBy() {
      return 0;
    },
    togglePlay() {
      return 'pause';
    }
  },
  speedController: {
    changePlaybackRate() {
      changed += 1;
      return 1.25;
    }
  },
  toggleSubtitle: async () => ({ ok: true, action: 'on' }),
  notify(message) {
    notice = message;
  }
});
assert.equal(listeners.some(item => item.type === 'dblclick' && item.capture === true), true);

function fire(type, event) {
  for (const item of listeners.filter(item => item.type === type)) {
    item.fn({ type, preventDefault() {}, stopPropagation() {}, ...event });
  }
}

fire('keydown', chromeShiftPeriod);
assert.equal(changed, 1);
fire('keydown', safariShiftPeriod);
assert.equal(changed, 2);
assert.equal(notice, '>> 1.25x');
fire('keydown', safariShiftComma);
assert.equal(changed, 3);
fire('dblclick', {});
fire('keydown', safariZoomKey);
fire('keydown', safariZoomKeyUnidentified);
assert.equal(changed, 3);
fire('keydown', safariShiftPeriodGreater);
fire('keydown', chromeShiftComma);
assert.equal(changed, 5);
fire('keydown', { key: 'j', repeat: false, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false });
assert.equal(notice, '-5s');
cleanup();
assert.equal(listeners.length, 0);

console.log('keymap checks passed');
