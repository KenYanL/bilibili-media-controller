# Bilibili Media Controller

A lightweight Tampermonkey script for Bilibili video enhancement.

## Features

- C: Toggle subtitles; pages without a Bilibili subtitle switch hide/show the subtitle layer directly
- J: rewind 5s
- L: forward 5s
- K: play/pause
- Shift+<: decrease playback speed by 0.25x
- Shift+>: increase playback speed by 0.25x
- Playback speed HUD appears as `>> 1.25x`
- Playback speed preference is remembered for the next video and future reloads

The list above covers shortcuts handled by this script. Native Bilibili player shortcuts such as `F` for fullscreen still work, but they are provided by Bilibili rather than this userscript.

## Scope

Only runs on:
https://www.bilibili.com/video/*
https://www.bilibili.com/festival/*

No impact on YouTube or other websites.

## Installation

Install via Tampermonkey:
dist/bilibili-enhancer.user.js

---

# Bilibili Media Controller

一个轻量级的 Bilibili 视频增强 Tampermonkey 脚本。

## 功能

- C：切换字幕；没有 B 站字幕开关的页面会直接隐藏/恢复字幕层
- J：后退 5 秒
- L：前进 5 秒
- K：播放/暂停
- Shift+<：降低 0.25x 播放速度
- Shift+>：提高 0.25x 播放速度
- 倍速 HUD 显示格式为 `>> 1.25x`
- 倍速偏好会记住，并应用到下一个视频和后续刷新

上面这组是本脚本接管或增强的快捷键。像 `F` 这类 B 站播放器原生快捷键依然可用，但它们不是这个 userscript 实现的功能。

## 作用范围

仅运行于：
https://www.bilibili.com/video/*
https://www.bilibili.com/festival/*

不会影响 YouTube 或其他网站。

## 安装

通过 Tampermonkey 安装：
dist/bilibili-enhancer.user.js
