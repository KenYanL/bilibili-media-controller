import assert from 'node:assert/strict';

import { getHudScale } from '../src/main.js';

assert.equal(getHudScale({ width: 1920, height: 1080 }), 1);
assert.equal(getHudScale({ width: 960, height: 1080 }), 0.5);
assert.equal(getHudScale({ width: 1920, height: 540 }), 0.5);

console.log('main hud checks passed');
