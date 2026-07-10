import assert from 'node:assert/strict';

import { bindMediaLifecycleInit, getHudScale, HUD_AUTO_HIDE_DELAY_MS } from '../src/main.js';

assert.equal(getHudScale({ width: 1920, height: 1080 }), 1);
assert.equal(getHudScale({ width: 960, height: 1080 }), 0.5);
assert.equal(getHudScale({ width: 1920, height: 540 }), 0.5);
assert.equal(HUD_AUTO_HIDE_DELAY_MS, 300);

const originalHTMLMediaElement = globalThis.HTMLMediaElement;
const originalMutationObserver = globalThis.MutationObserver;
let observer = null;
class FakeMutationObserver {
  constructor(callback) {
    this.callback = callback;
    this.disconnected = false;
    observer = this;
  }
  observe() {}
  disconnect() {
    this.disconnected = true;
  }
}
class FakeMedia {
  constructor(readyState) {
    this.readyState = readyState;
    this.listeners = new Map();
  }
  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }
  removeEventListener(type, listener) {
    if (this.listeners.get(type) === listener) this.listeners.delete(type);
  }
  dispatch(type) {
    this.listeners.get(type)?.();
  }
}
globalThis.HTMLMediaElement = { HAVE_METADATA: 1 };
globalThis.MutationObserver = FakeMutationObserver;

let activeMedia = null;
let syncCount = 0;
const cleanupLifecycle = bindMediaLifecycleInit({
  getMedia() {
    return activeMedia;
  }
}, {
  syncPlaybackRate() {
    syncCount += 1;
  }
}, { body: {} });

const firstMedia = new FakeMedia(0);
activeMedia = firstMedia;
observer.callback();
firstMedia.dispatch('loadedmetadata');
firstMedia.dispatch('playing');
assert.equal(syncCount, 2);

const secondMedia = new FakeMedia(1);
activeMedia = secondMedia;
observer.callback();
assert.equal(syncCount, 3);
firstMedia.dispatch('playing');
assert.equal(syncCount, 3);
secondMedia.dispatch('playing');
assert.equal(syncCount, 4);

cleanupLifecycle();
assert.equal(observer.disconnected, true);
secondMedia.dispatch('playing');
assert.equal(syncCount, 4);
globalThis.HTMLMediaElement = originalHTMLMediaElement;
globalThis.MutationObserver = originalMutationObserver;

console.log('main hud checks passed');
