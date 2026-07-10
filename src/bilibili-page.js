export const BILIBILI_HOST = 'www.bilibili.com';

const VIDEO_PATH_RE = /^\/video\//;
const FESTIVAL_PATH_RE = /^\/festival\//;

export function isBilibiliPlaybackPage(locationRef = window.location) {
  if (locationRef.hostname !== BILIBILI_HOST) return false;
  if (VIDEO_PATH_RE.test(locationRef.pathname)) return true;
  return FESTIVAL_PATH_RE.test(locationRef.pathname);
}
