# ChatGPT PetrifyUI

An unofficial Chrome/Chromium Manifest V3 extension that styles **only ChatGPT's existing sidebar and sidebar header**, using carved walnut and VT323 from Google Fonts.

## Version 0.3.0

- VT323 for sidebar text, chat rows, section labels and sidebar header.
- Wooden ChatGPT/search/collapse header instead of a separate black strip.
- Keeps native selected and deselected project colors, plus all existing icons.
- Removes the extra URL-derived chat selection state and broad nested hover styling that caused double highlights.
- Targets scrollbar styling to the real sidebar scroll container, not every descendant.
- Does not replace DOM content or modify ChatGPT's main chat, composer, or navigation handlers.

## How to test

1. Clone: `git clone https://github.com/Notagai/ChatGPT-PetrifyUI.git`
2. Open `chrome://extensions` and switch on **Developer mode**.
3. Click **Load unpacked** and choose this folder (with `manifest.json`).
4. Refresh `https://chatgpt.com/` and inspect the sidebar and ChatGPT logo row.
5. Click the PetrifyUI toolbar icon to switch styling off and on.

If already installed, run `git pull`, click **Reload** on the extension card and refresh ChatGPT.

### Regression checks

- Native ChatGPT logo, search, sidebar toggle, New chat, Library, Plugins, Projects, recent chats and profile remain clickable.
- Project colors are unchanged for selected and deselected projects.
- Selected chat rows no longer receive a separate overlay or doubled hover border.
- Scrollbars remain on the actual scrolling area without odd extra tracks.
- The chat itself, message composer, and main UI stay unchanged.
- Check both expanded/collapsed sidebar and a narrower browser window.

## Notes

- No build step. The local Chrome/Edge extension uses Manifest V3.
- No tracking, analytics, ChatGPT API usage, or chat-content access.
- `storage` permission remembers the on/off toggle.
- VT323 is loaded from Google Fonts (`fonts.googleapis.com` and `fonts.gstatic.com`). It needs a network connection; Google may receive normal font-request metadata. A monospace fallback is used when blocked.
- Script adds only `data-petrifyui-*` styling markers to existing elements. It does not move nodes, add overlays or intercept clicks.
- Header detection is deliberately conservative. ChatGPT DOM updates may require updating selectors.
- Menus rendered in separate portals outside the sidebar are deliberately not restyled.
- A synthetic browser test is included at `tests/smoke.py`; it does not validate a live signed-in ChatGPT page.

Not affiliated with or endorsed by OpenAI. ChatGPT is an OpenAI trademark.

## v0.3 sidebar update

- Smaller sidebar text with VT323 loaded through Google Fonts.
- Stronger pixel wood background, including narrow/collapsed sidebar.
- A small ChatGPT mark on the existing header selector.
- ChatGPT/Codex dropdown styling when rendered in a popover near the header.
- All original icons, project colors, messages, links and clicks are preserved.

**Update:** `git pull origin main`, then Reload at `chrome://extensions` and refresh ChatGPT. Fonts may require access to Google Fonts.
