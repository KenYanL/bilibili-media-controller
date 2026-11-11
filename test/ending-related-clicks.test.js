import assert from 'node:assert/strict';

import { HUD_AUTO_HIDE_DELAY_MS, ensureHUD, notify, setHudVisible } from '../src/main.js';
import { initKeymap } from '../src/keymap.js';

globalThis.window = { innerWidth: 1920, innerHeight: 1080 };
globalThis.Element = class Element {};

function camelStyleName(name) {
  return name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function createStyle() {
  const style = {};
  style.setProperty = (name, value) => {
    style[camelStyleName(name)] = value;
  };
  return style;
}

function matches(element, selector) {
  if (!element || element === documentBody) return false;
  if (selector.startsWith('#')) return element.id === selector.slice(1);
  if (selector.startsWith('.')) {
    return String(element.className || '')
      .split(/\s+/)
      .includes(selector.slice(1));
  }
  return String(element.tagName || '').toLowerCase() === selector.toLowerCase();
}

function queryAll(root, selector) {
  const found = [];
  const visit = node => {
    if (!node) return;
    if (matches(node, selector)) found.push(node);
    for (const child of node.children || []) visit(child);
  };
  visit(root);
  return found;
}

function createElement(tagName, className = '') {
  const element = {
    tagName: String(tagName).toUpperCase(),
    id: '',
    className,
    style: createStyle(),
    children: [],
    parentElement: null,
    textContent: '',
    href: '',
    listeners: [],
    appendChild(child) {
      if (child.parentElement) {
        const siblings = child.parentElement.children;
        const index = siblings.indexOf(child);
        if (index >= 0) siblings.splice(index, 1);
      }
      child.parentElement = this;
      this.children.push(child);
      return child;
    },
    contains(node) {
      if (node === this) return true;
      return this.children.some(child => child.contains(node));
    },
    querySelector(selector) {
      return queryAll(this, selector)[0] || null;
    },
    querySelectorAll(selector) {
      return queryAll(this, selector);
    },
    closest(selector) {
      let current = this;
      while (current) {
        if (matches(current, selector)) return current;
        current = current.parentElement;
      }
      return null;
    },
    addEventListener(type, fn, capture) {
      this.listeners.push({ type, fn, capture: Boolean(capture) });
    },
    removeEventListener(type, fn, capture) {
      const useCapture = Boolean(capture);
      const index = this.listeners.findIndex(
        item => item.type === type && item.fn === fn && item.capture === useCapture
      );
      if (index >= 0) this.listeners.splice(index, 1);
    }
  };
  return element;
}

const documentBody = createElement('body');
const player = createElement('div', 'bpx-player-container');
const endingWrap = createElement('div', 'bpx-player-ending-wrap');
const endingRelated = createElement('div', 'bpx-player-ending-related');
endingWrap.appendChild(endingRelated);
player.appendChild(endingWrap);
documentBody.appendChild(player);

const cards = [];
for (let index = 1; index <= 6; index += 1) {
  const card = createElement('a', 'bpx-player-ending-related-item');
  card.href = `/video/BV${index}`;
  card.index = index;
  endingRelated.appendChild(card);
  cards.push(card);
}

const documentRef = {
  body: documentBody,
  fullscreenElement: null,
  activeElement: null,
  listeners: [],
  querySelector(selector) {
    if (selector.startsWith('#')) {
      const hud = queryAll(documentBody, selector)[0];
      if (hud) return hud;
    }
    return queryAll(documentBody, selector)[0] || null;
  },
  querySelectorAll(selector) {
    return queryAll(documentBody, selector);
  },
  createElement(tagName) {
    const element = createElement(tagName);
    element.ownerDocument = documentRef;
    return element;
  },
  addEventListener(type, fn, capture) {
    this.listeners.push({ type, fn, capture: Boolean(capture) });
  },
  removeEventListener(type, fn, capture) {
    const useCapture = Boolean(capture);
    const index = this.listeners.findIndex(
      item => item.type === type && item.fn === fn && item.capture === useCapture
    );
    if (index >= 0) this.listeners.splice(index, 1);
  }
};

function dispatch(target, type, extra = {}) {
  let stopped = false;
  let defaultPrevented = false;
  const event = {
    type,
    target,
    currentTarget: null,
    detail: extra.detail ?? 1,
    bubbles: true,
    cancelable: true,
    defaultPrevented: false,
    preventDefault() {
      defaultPrevented = true;
      this.defaultPrevented = true;
    },
    stopPropagation() {
      stopped = true;
    },
    ...extra
  };

  const path = [];
  let node = target;
  while (node) {
    path.push(node);
    node = node.parentElement;
  }
  path.push(documentRef);

  const invoke = (element, capture) => {
    event.currentTarget = element;
    const listeners = (element.listeners || []).filter(item => item.type === type && item.capture === capture);
    for (const item of listeners) item.fn(event);
  };

  for (const element of [...path].reverse()) {
    invoke(element, true);
    if (stopped) return { event, stopped, defaultPrevented };
  }
  for (const element of path) {
    invoke(element, false);
    if (stopped) return { event, stopped, defaultPrevented };
  }
  return { event, stopped, defaultPrevented };
}

function isHudClickTransparent(hud) {
  return hud.style.pointerEvents === 'none' && (hud.style.visibility === 'hidden' || hud.style.display === 'none');
}

const hud = ensureHUD(documentRef);
assert.equal(hud.parentElement, player);
assert.equal(isHudClickTransparent(hud), true);
assert.equal(hud.style.width, 'auto');
assert.equal(hud.style.height, 'auto');
assert.equal(hud.style.flex, 'none');

const clicked = [];
for (const card of cards) {
  card.addEventListener('click', () => {
    clicked.push(card.index);
  });
}

const notices = [];
const seeks = [];
let playState = 'pause';
const rates = [];
const cleanupKeymap = initKeymap({
  document: documentRef,
  location: { hostname: 'www.bilibili.com', pathname: '/video/BV1' },
  media: {
    seekBy(delta) {
      seeks.push(delta);
      return delta;
    },
    togglePlay() {
      playState = playState === 'pause' ? 'play' : 'pause';
      return playState;
    }
  },
  speedController: {
    changePlaybackRate(delta) {
      rates.push(delta);
      return 1 + delta;
    }
  },
  toggleSubtitle: async () => ({ ok: true, action: 'on' }),
  notify(message) {
    notices.push(message);
  }
});

for (const card of cards.slice(1)) {
  const result = dispatch(card, 'click', { detail: 1 });
  assert.equal(result.stopped, false, `click on card ${card.index} should not be stopped`);
  assert.equal(result.defaultPrevented, false, `click on card ${card.index} should not be canceled`);
}
assert.deepEqual(clicked, [2, 3, 4, 5, 6]);

for (const card of cards.slice(1)) {
  const down = dispatch(card, 'mousedown');
  assert.equal(down.stopped, false);
  assert.equal(down.defaultPrevented, false);
}

setHudVisible(hud, true);
assert.equal(hud.style.visibility, 'visible');
assert.equal(hud.style.pointerEvents, 'none');
setHudVisible(hud, false);
assert.equal(isHudClickTransparent(hud), true);

notify(hud, '>> 1.25x');
assert.equal(hud.style.visibility, 'visible');
assert.equal(hud.style.opacity, '1');
assert.equal(hud.style.pointerEvents, 'none');
await new Promise(resolve => setTimeout(resolve, HUD_AUTO_HIDE_DELAY_MS + 30));
assert.equal(isHudClickTransparent(hud), true);

clicked.length = 0;
for (const card of cards.slice(1)) dispatch(card, 'click', { detail: 1 });
assert.deepEqual(clicked, [2, 3, 4, 5, 6]);

const keys = { repeat: false, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false };
dispatch(documentBody, 'keydown', { key: 'j', ...keys });
assert.deepEqual(seeks, [-5]);
assert.equal(notices.at(-1), '-5s');
dispatch(documentBody, 'keydown', { key: 'l', ...keys });
assert.deepEqual(seeks, [-5, 5]);
assert.equal(notices.at(-1), '+5s');
dispatch(documentBody, 'keydown', { key: 'k', ...keys });
assert.equal(notices.at(-1), 'Play');
dispatch(documentBody, 'keydown', { key: 'c', ...keys });
await new Promise(resolve => setTimeout(resolve, 0));
assert.equal(notices.at(-1), 'Subtitles on');
dispatch(documentBody, 'keydown', { key: '>', code: 'Period', shiftKey: true, ctrlKey: false, metaKey: false, altKey: false, repeat: false });
assert.deepEqual(rates, [0.25]);
assert.equal(notices.at(-1), '>> 1.25x');

cleanupKeymap();
console.log('ending-related click checks passed');
