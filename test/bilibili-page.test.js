import assert from 'node:assert/strict';

import { isBilibiliPlaybackPage } from '../src/bilibili-page.js';

assert.equal(isBilibiliPlaybackPage({
  hostname: 'www.bilibili.com',
  pathname: '/video/BV1QrMx6UEBA',
  search: ''
}), true);
assert.equal(isBilibiliPlaybackPage({
  hostname: 'www.bilibili.com',
  pathname: '/festival/worldcup',
  search: '?bvid=BV1QrMx6UEBA'
}), true);
assert.equal(isBilibiliPlaybackPage({
  hostname: 'www.bilibili.com',
  pathname: '/festival/worldcup',
  search: ''
}), true);
assert.equal(isBilibiliPlaybackPage({
  hostname: 'www.bilibili.com',
  pathname: '/',
  search: ''
}), false);
assert.equal(isBilibiliPlaybackPage({
  hostname: 'www.youtube.com',
  pathname: '/video/BV1QrMx6UEBA',
  search: ''
}), false);

console.log('bilibili-page checks passed');
