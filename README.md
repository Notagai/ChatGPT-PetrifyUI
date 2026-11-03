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

## v1.1: Texture loading root-cause fix

The brown-looking screenshot was sampled: empty regions were exactly RGB `(99,65,46)` with **zero pixel variation**, proving the `#63412e` fallback color was visible while the SVG background image was not. Earlier versions mistakenly placed relative `url("../assets/...")` inside a CSS custom property, then used `var(--pui-wood)`, which can resolve against the wrong base URL.

The fix supplies a fully qualified `chrome.runtime.getURL("assets/walnut-wood-v3.svg")` from the isolated content script, and keeps a direct stylesheet-relative URL fallback. A secondary CSS grain layer is visible even when the image cannot be loaded. The script probes the image and sets `document.documentElement.dataset.petrifyuiTexture` to `loaded` or `failed` for troubleshooting in DevTools. Removed `background-attachment: fixed` from nested scrolling wrappers to avoid Chromium background compositing issues.

This update only changes texture loading and related regression tests; icon colors, menus, chats and layout are unchanged.

## v1.2: Fix image 404s and font CSP

All image URLs in content stylesheets now come from the extension's own `chrome.runtime.getURL()`, not page-relative `../assets/` paths. The sidebar script checks each image and tries a data-URI fallback. CSS gradients remain when both loading methods fail.

The VT323 stylesheet was blocked by ChatGPT's Content Security Policy. No Google Fonts stylesheet is inserted into the page now. A Manifest V3 background worker requests VT323 font bytes from Google Fonts (requiring Google Fonts host permissions) and transfers them into the page's FontFace API through the extension. ChatGPT messages and account data are never sent to Google Fonts.

The browser page now exposes status fields on `document.documentElement.dataset`: `petrifyuiTexture`, `petrifyuiPaper`, `petrifyuiBrand`, and `petrifyuiFont`. No page-relative texture or brand-mark requests should remain.

Disable any duplicate older installed copies before testing. Reload the extension at chrome://extensions and hard-refresh ChatGPT.

## v1.3: Sidebar alignment and accent corrections

- The walnut image is painted once on the sidebar root, rather than again on nested scroll and layout panels at different origins. This removes mismatched seams and duplicated grain.
- The ChatGPT trigger no longer receives an extra pseudo-logo that displaced its text and chevron.
- The selected chat highlight is softened; the native original icons and project accent colors remain unchanged.
- Menu parchment, text, muted labels and amber accents use a consistent palette and less aggressive borders.
- Slider and settings popovers (including Thinking effort) are excluded from menu decoration. Native functional accent colors are left alone.
- Texture asset loading and VT323 font fixes from v1.2 remain intact.

Update with `git pull origin main`, reload the extension in `chrome://extensions`, and hard refresh ChatGPT. Live signed-in appearance still needs verification.

## v1.4: Collapsed rail, toggle safety and low power

- Themes the separately rendered narrow collapsed sidebar as walnut without changing its icon sizes, flex layout, native toggle or tooltips.
- Never hides or intercepts the sidebar toggle; cleans up expansion-only markers when the rail replaces the full sidebar.
- Incremental row marker reconciliation replaces clearing every item on every render. No mutations are observed from extension-owned data attributes.
- Avoids expensive full-tree scroller scans, and skips redundant underlay scans on low-power devices.
- Low-power mode activates automatically for reduced motion, data saver, limited memory, or four-or-fewer CPU threads. It drops decorative shadows and lowers popup scanning work.
- Leaves original project colors, menu functionality, content and texture/font loader intact.

Test after updating: expand/collapse repeatedly with the toolbar button and Ctrl+Shift+S, including pointer hover; verify the toggle tooltip disappears normally, the compact rail keeps its native icons, and main chat controls remain unchanged.

## v1.5: performance and native toggle reliability

PetrifyUI now runs minimal, event-driven sidebar discovery instead of continuously traversing every ChatGPT DOM mutation. It no longer scans and adds markers to every conversation row on every update. Popup menus refresh on relevant pointer/keyboard interactions and direct body portal changes rather than every streamed message. The top bar, sidebar toggle and tooltip are intentionally left completely native to prevent misalignment and stuck UI; the wood texture still applies to the expanded sidebar and independently rendered collapsed rail. The VT323/asset loading from v1.2 remains.

For an A/B performance comparison, use the extension toggle, hard-refresh the page, and repeat the same ChatGPT action. If ChatGPT is laggy with the extension disabled too, that baseline isn't from PetrifyUI.

## v1.6: Permanent sidebar targeting (fix for default UI after brief flash)

Previous versions marked a specific DOM element at runtime. ChatGPT can replace that element after mounting, making the wood flash briefly and disappear. v1.6 removes sidebar DOM scanning, mutation/resize observers, and node markers. CSS directly targets ChatGPT's known sidebar containers at `document_start`, and the content script sets only a persistent `html[data-petrifyui-active]` preference flag. React's sidebar remounts cannot remove the CSS rule.

The menu logic stays a separate idle-time script, so it can safely inspect native popovers after the DOM exists. Existing wood/font asset loading, low-power profile, and original ChatGPT layout and controls remain unchanged.

For troubleshooting, inspect `document.documentElement.hasAttribute("data-petrifyui-active")`. If true but the sidebar is unstyled, ChatGPT introduced a new sidebar container selector and this version will need a selector update, not more mutation scanning.

## v1.7: Fix the black ChatGPT top-left header

The top-left toolbar was intentionally left unstyled in v1.5/1.6 to protect its toggle button, but this caused a black strip above the walnut sidebar. v1.7 gives that existing header the same wood background. Detection checks only the ancestors of one point in the toolbar, on startup and after relevant sidebar toggles/window resizing. It never observes streamed messages, changes click handlers, inserts fake icons, resizes buttons, or styles tooltip overlays.

The sidebar still uses stable CSS selectors. Use `git pull origin main`, reload the Chrome extension, then hard-refresh ChatGPT.
