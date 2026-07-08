export const BILIBILI_HOST = 'www.bilibili.com';

const VIDEO_PATH_RE = /^\/video\//;
const FESTIVAL_PATH_RE = /^\/festival\//;

function hasBvidQuery(locationRef) {
  const search = locationRef.search || '';
  return new URLSearchParams(search).has('bvid');
}

export function isBilibiliPlaybackPage(locationRef = window.location) {
  if (locationRef.hostname !== BILIBILI_HOST) return false;
  if (VIDEO_PATH_RE.test(locationRef.pathname)) return true;
  return FESTIVAL_PATH_RE.test(locationRef.pathname) && hasBvidQuery(locationRef);
}
