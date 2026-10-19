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

const realSpeedKey = { key: '>', code: 'Period', keyCode: 190, shiftKey: true, ctrlKey: false, metaKey: false, altKey: false };
const guard = createSpeedGestureGuard();
assert.equal(isAccidentalPlaybackRateEvent(realSpeedKey, guard, 1000), false);
assert.equal(isAccidentalPlaybackRateEvent({ ...realSpeedKey, code: '' }, guard, 1000), true);
assert.equal(isAccidentalPlaybackRateEvent({ ...realSpeedKey, code: 'Unidentified' }, guard, 1000), true);
assert.equal(isAccidentalPlaybackRateEvent({ ...realSpeedKey, keyCode: 0 }, guard, 1000), true);

noteSpeedGesture(guard, 'mousedown', {}, 1000);
assert.equal(isAccidentalPlaybackRateEvent(realSpeedKey, guard, 1100), false);
noteSpeedGesture(guard, 'mousedown', {}, 1200);
noteSpeedGesture(guard, 'dblclick', {}, 1200);
assert.equal(isAccidentalPlaybackRateEvent(realSpeedKey, guard, 1300), true);
assert.equal(isAccidentalPlaybackRateEvent(realSpeedKey, guard, 1200 + 500), false);

const taps = createSpeedGestureGuard();
noteSpeedGesture(taps, 'touchend', {}, 2000);
noteSpeedGesture(taps, 'mousedown', {}, 2010);
assert.equal(isAccidentalPlaybackRateEvent(realSpeedKey, taps, 2020), false);
noteSpeedGesture(taps, 'touchend', {}, 2300);
assert.equal(isAccidentalPlaybackRateEvent(realSpeedKey, taps, 2310), true);

const zoom = createSpeedGestureGuard();
noteSpeedGesture(zoom, 'gesturestart', {}, 3000);
assert.equal(isAccidentalPlaybackRateEvent(realSpeedKey, zoom, 3100), true);
const secondClick = createSpeedGestureGuard();
noteSpeedGesture(secondClick, 'click', { detail: 1 }, 4000);
assert.equal(isAccidentalPlaybackRateEvent(realSpeedKey, secondClick, 4010), false);
noteSpeedGesture(secondClick, 'click', { detail: 2 }, 4200);
assert.equal(isAccidentalPlaybackRateEvent(realSpeedKey, secondClick, 4210), true);

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

fire('keydown', realSpeedKey);
assert.equal(changed, 1);
fire('dblclick', {});
fire('keydown', realSpeedKey);
assert.equal(changed, 1);
fire('keydown', { key: 'j' });
assert.equal(notice, '-5s');
cleanup();
assert.equal(listeners.length, 0);

console.log('keymap checks passed');
