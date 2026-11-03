# ChatGPT PetrifyUI

An unofficial Chrome/Chromium Manifest V3 appearance-only extension for ChatGPT.

## v1.0.0: Visible walnut and subtle selection

The previous approach painted an oversized paper background behind Recents while leaving other sections unchanged. This version removes section-wide paper detection entirely.

- Quiet, vertical-grain pixel walnut as the sidebar shell and header.
- Low-key carved-wood navigation, project and chat rows; parchment appears on hover and for the active chat, not every single entry.
- Compact VT323 typography, native icons and preserved ChatGPT navigation.
- Dark walnut trim and matching parchment for in-page menus and submenus.
- Original collapsed sidebar, scrollbar positions, account controls and main chat structure are retained.
- No new elements, copied content, interception of clicks, API calls or analytics.

## Install and test

1. Clone: `git clone https://github.com/Notagai/ChatGPT-PetrifyUI.git`
2. Open `chrome://extensions`; enable Developer mode.
3. Choose Load unpacked and select the folder containing `manifest.json`.
4. Open or hard-refresh `https://chatgpt.com`.
5. Test navigation, Projects, Recents, ChatGPT/Codex selector, project/conversation menus and collapsed sidebar.
6. Use the extension toolbar switch to disable styling instantly.

Already installed? Run `git pull origin main`, click Reload on the extension card, then press Ctrl+Shift+R in ChatGPT.

## Scope and privacy

Styling only. The extension retains the existing DOM content and controls. `chrome.storage.local` stores the local on/off toggle. VT323 is loaded through Google Fonts when available; this makes normal font network requests to Google. ChatGPT DOM changes can require selector updates. Native browser context menus are not styled.

See `src/sidebar.js`, `src/sidebar.css`, `src/menus.js` and `src/menus.css` for implementation.

## v0.9 corrective changes

Screenshot feedback: the paper rectangles covered the navigation and Projects, while most Recents rows remained unstyled. Row detection now climbs to the full native clickable row and excludes section headings. Paper is used sparingly as a hover/current-row accent; all other rows blend into the walnut. No arbitrary section wrappers, added cards, layout edits, icon swaps or changed chat content.

## v1.0 fix

The wood SVG is now stronger, with natural vertical grain and small knots rather than horizontal stripe bands. It is repeated at native 512px resolution and applied to the main sidebar plus broad internal scrolling wrappers using viewport-aligned backgrounds. Selected rows use 19% transparent warm tint with a narrow gold accent instead of the previous solid beige parchment block. Resting rows no longer get border strokes or fill; hover is 9.5% warm tint. Layout, icons, project colors, ChatGPT content, and all existing menu logic stay unchanged.

Regression test: `python tests/wood_smoke.py` with Playwright and Chromium installed. This verifies visual CSS in a synthetic browser fixture, not a signed-in ChatGPT page.
