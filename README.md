# Bilibili Media Controller

A lightweight Tampermonkey script for Bilibili video enhancement.

## Features

- C: Toggle subtitles; shows `No subtitles` when none are available; pages without a Bilibili subtitle switch hide/show the subtitle layer directly
- J: rewind 5s
- L: forward 5s
- K: play/pause
- Shift+<: decrease playback speed by 0.25x
- Shift+>: increase playback speed by 0.25x
- Playback speed HUD appears as `>> 1.25x`
- Playback speed preference is remembered for the next video and future reloads when you change it with Shift+< or Shift+>
- Double-click or double-tap zoom/fullscreen does not change playback speed. A stored 1.25x left by that Safari bug is reset once; choosing 1.25x afterward is remembered

The list above covers shortcuts handled by this script. Native Bilibili player shortcuts such as `F` for fullscreen still work, but they are provided by Bilibili rather than this userscript.

## Native Bilibili shortcuts (not from this script)

These are built into Bilibili's player and work with or without this script.

| Key | Action |
| --- | --- |
| Space | Play/pause |
| ← / → | Rewind / forward 5s (hold → to speed up temporarily) |
| ↑ / ↓ | Volume +10% / -10% |
| F / Esc | Enter or exit fullscreen / exit fullscreen |
| D | Toggle danmaku (bullet comments) |
| M | Toggle mute |
| Enter | Send a danmaku |
| Shift+1 / Shift+2 | 1x / 2x speed |
| [ / ] | Previous / next part (multi-part videos) |

> ⚠️ **Watch out for accidental clicks.** These native keys act on your account immediately: **G follows the uploader** (it sits right next to D), **Q likes** (hold Q or R for like + coin + favorite), **W gives a coin**, **E adds to favorites**. If you suddenly find yourself following someone, you probably hit G instead of D.

## Notes

Shortcuts need an English input method. With a Chinese IME such as Pinyin active, the IME captures key presses and this script does not receive them. Switch to English input first (for example Shift or Caps Lock, depending on the IME).

## Scope

Only runs on:
https://www.bilibili.com/video/*
https://www.bilibili.com/festival/*
https://www.bilibili.com/bangumi/play/*

No impact on YouTube or other websites.

## Installation

Install with Tampermonkey from:

https://raw.githubusercontent.com/KenYanL/bilibili-media-controller/main/dist/bilibili-enhancer.user.js

The script file in this repository is `dist/bilibili-enhancer.user.js`. It is also listed on [Greasy Fork](https://greasyfork.org/en/scripts/585823-bilibili-enhancer-lite).

---

# Bilibili Media Controller

一个轻量级的 Bilibili 视频增强 Tampermonkey 脚本。

## 功能

- C：切换字幕；没有字幕时显示 `No subtitles`；没有 B 站字幕开关的页面会直接隐藏/恢复字幕层
- J：后退 5 秒
- L：前进 5 秒
- K：播放/暂停
- Shift+<：降低 0.25x 播放速度
- Shift+>：提高 0.25x 播放速度
- 倍速 HUD 显示格式为 `>> 1.25x`
- 用 Shift+< 或 Shift+> 改过的倍速会记住，并应用到下一个视频和后续刷新
- 双击或双点缩放/全屏不会改变播放速度。Safari 这个误触留下的 1.25x 会在更新后重置一次；之后再设成 1.25x 仍会记住

上面这组是本脚本接管或增强的快捷键。像 `F` 这类 B 站播放器原生快捷键依然可用，但它们不是这个 userscript 实现的功能。

## B 站自带快捷键（不是本脚本提供的）

这些是 B 站播放器自带的，装不装本脚本都能用。

| 按键 | 作用 |
| --- | --- |
| 空格 | 播放/暂停 |
| ← / → | 后退 / 前进 5 秒（长按 → 临时倍速） |
| ↑ / ↓ | 音量 +10% / -10% |
| F / Esc | 进入或退出全屏 / 退出全屏 |
| D | 开关弹幕 |
| M | 开关静音 |
| Enter | 发弹幕 |
| Shift+1 / Shift+2 | 一倍速 / 两倍速 |
| [ / ] | 多 P 上一个 / 下一个 |

> ⚠️ **小心误触。** 下面这些键会直接作用在你的账号上：**G 是关注 UP 主**（就在 D 旁边），**Q 点赞**（长按 Q 或 R 一键三连），**W 投币**，**E 收藏**。如果莫名其妙关注了某个 UP 主，多半是想按 D 时按到了 G。

## 注意

快捷键需要英文输入法。中文输入法（例如拼音）开启时，按键会被输入法截获，脚本收不到。使用快捷键前先切到英文输入（例如按 Shift 或 Caps Lock，视输入法而定）。

## 作用范围

仅运行于：
https://www.bilibili.com/video/*
https://www.bilibili.com/festival/*
https://www.bilibili.com/bangumi/play/*

不会影响 YouTube 或其他网站。

## 安装

通过 Tampermonkey 安装：

https://raw.githubusercontent.com/KenYanL/bilibili-media-controller/main/dist/bilibili-enhancer.user.js

仓库中的脚本文件是 `dist/bilibili-enhancer.user.js`。也可以在 [Greasy Fork](https://greasyfork.org/en/scripts/585823-bilibili-enhancer-lite) 安装。
