import assert from 'node:assert/strict';

import { toggleSubtitle } from '../src/bilibili-subtitle.js';

const locationRef = {
  hostname: 'www.bilibili.com',
  pathname: '/festival/worldcup',
  search: '?bvid=BV1QrMx6UEBA'
};
const originalWindow = globalThis.window;

function createFixture({ activeLanguage = true, closeSwitch = false, subtitlePanel = true } = {}) {
  const panel = subtitlePanel ? {} : null;
  const subtitleRenderer = {
    style: {}
  };
  const activeLangItem = {};
  const closeButton = {
    clicked: false,
    click() {
      this.clicked = true;
    }
  };
  const root = {
    dataset: {},
    querySelector(selector) {
      if (selector === '.bpx-player-ctrl-subtitle-box') return panel;
      if (selector === '.bpx-player-ctrl-subtitle-language-item.bpx-state-active') return activeLanguage ? activeLangItem : null;
      if (selector.includes('.bpx-player-ctrl-subtitle-close-switch')) return closeSwitch ? closeButton : null;
      if (selector.includes('.bpx-player-ctrl-subtitle-language-item[data-lan=')) return activeLanguage ? activeLangItem : null;
      if (selector === '.bpx-player-ctrl-subtitle-language-item[data-lan]') return activeLanguage ? activeLangItem : null;
      return null;
    },
    querySelectorAll(selector) {
      if (selector.includes('.bpx-player-subtitle-wrap')) return [subtitleRenderer];
      return [];
    }
  };
  const documentRef = {
    querySelector() {
      return root;
    }
  };

  return { closeButton, documentRef, root, subtitleRenderer };
}

globalThis.window = {
  location: locationRef,
  getComputedStyle() {
    return { display: 'block', visibility: 'visible' };
  }
};

const missingCloseFixture = createFixture({ closeSwitch: false });
assert.deepEqual(await toggleSubtitle({
  document: missingCloseFixture.documentRef,
  location: locationRef
}), { ok: true, action: 'off' });
assert.equal(missingCloseFixture.subtitleRenderer.style.visibility, 'hidden');
assert.equal(missingCloseFixture.root.dataset.bilibiliEnhancerSubtitleHidden, 'true');
assert.deepEqual(await toggleSubtitle({
  document: missingCloseFixture.documentRef,
  location: locationRef
}), { ok: true, action: 'on' });
assert.equal(missingCloseFixture.subtitleRenderer.style.visibility, '');
assert.equal(missingCloseFixture.root.dataset.bilibiliEnhancerSubtitleHidden, 'false');

const closeFixture = createFixture({ closeSwitch: true });
assert.deepEqual(await toggleSubtitle({
  document: closeFixture.documentRef,
  location: locationRef
}), { ok: true, action: 'off' });
assert.equal(closeFixture.closeButton.clicked, true);

const rendererOnlyFixture = createFixture({ activeLanguage: false, subtitlePanel: false });
assert.deepEqual(await toggleSubtitle({
  document: rendererOnlyFixture.documentRef,
  location: locationRef
}), { ok: true, action: 'off' });
assert.equal(rendererOnlyFixture.subtitleRenderer.style.visibility, 'hidden');

globalThis.window = originalWindow;

console.log('bilibili-subtitle checks passed');
