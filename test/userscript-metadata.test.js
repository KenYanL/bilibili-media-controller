import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = 'https://github.com/KenYanL/bilibili-media-controller';
const rawScript = 'https://raw.githubusercontent.com/KenYanL/bilibili-media-controller/main/dist/bilibili-enhancer.user.js';
const dist = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../dist/bilibili-enhancer.user.js'), 'utf8');
const header = dist.slice(0, dist.indexOf('// ==/UserScript=='));

assert.match(header, /^\/\/ ==UserScript==$/m);
assert.match(header, new RegExp(`^// @namespace\\s+${repo}$`, 'm'));
assert.match(header, /^\/\/ @version\s+0\.1\.14$/m);
assert.match(header, /^\/\/ @author\s+KenYanL$/m);
assert.match(header, new RegExp(`^// @homepageURL\\s+${repo}$`, 'm'));
assert.match(header, new RegExp(`^// @supportURL\\s+${repo}/issues$`, 'm'));
assert.match(header, /^\/\/ @license\s+MIT$/m);
assert.match(header, new RegExp(`^// @downloadURL\\s+${rawScript}$`, 'm'));
assert.match(header, new RegExp(`^// @updateURL\\s+${rawScript}$`, 'm'));
assert.equal(dist.includes('yanlinwang'), false);
assert.equal(/yanlinwang/i.test(dist), false);
