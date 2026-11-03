# ChatGPT PetrifyUI

An unofficial Chrome/Chromium Manifest V3 extension that restyles **only ChatGPT's existing sidebar** with dark carved walnut and amber pixel-art accents.

Version 0.1.0 is deliberately **sidebar only**. It leaves ChatGPT's conversation area, content, composer, text, navigation destinations, click targets, markup, layout, and native controls alone.

## How to install and test

1. Clone or download this repository. For git: git clone https://github.com/Notagai/ChatGPT-PetrifyUI.git
2. Open chrome://extensions (or edge://extensions / brave://extensions).
3. Enable **Developer mode**, then click **Load unpacked**.
4. Select the cloned **ChatGPT-PetrifyUI** folder containing manifest.json.
5. Open or refresh https://chatgpt.com/. The existing sidebar should take on a wooden background.
6. Click the PetrifyUI toolbar icon to toggle the effect on/off instantly.

### What to test

- Hover sidebar links and open recent chats. They must retain their text and normal navigation.
- Open/close the sidebar. It should retain the original width and layout.
- Check Library, Projects, New chat, profile, and conversation options. Native behavior should be unchanged.
- The central chat area, messages, composer and top controls should remain styled as before.
- Toggle the extension off and back on to compare.
- Try narrow windows and collapsed/overlay sidebars.

## Privacy and implementation

- No tracking, network requests, ChatGPT API calls, cookies, browser-history permission, or third-party libraries.
- The sole permission is storage, used to remember the local on/off switch.
- The content script looks for known sidebar containers (#stage-slideover-sidebar or #sidebar, with fallbacks), adds only data-petrifyui-* attributes, and observes sidebar replacements.
- CSS selectors are scoped to the detected sidebar. No global page restyling.
- Theme assets are bundled locally, including a repeating 256px wood texture.
- ChatGPT may change its internal DOM at any time; selectors may need maintenance.
- Menus rendered outside the sidebar in a portal are intentionally not restyled.

## Structure

- manifest.json: Chrome MV3 extension manifest
- src/sidebar.js: identifies the native sidebar, handles SPA updates and on/off state
- src/sidebar.css: scoped styles for sidebar wood, rows, labels and scrollbar
- assets/: repeating wooden texture and small extension icons
- popup/: toggle interface

**Development:** No build step. Update files, press Reload at chrome://extensions, and refresh ChatGPT.

Not affiliated with or endorsed by OpenAI. ChatGPT is an OpenAI trademark.
