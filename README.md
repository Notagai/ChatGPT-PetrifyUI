# ChatGPT PetrifyUI

## Floating parchment experiment v1.29.0 (NOT merged to main)

Version 1.29 replaces the structural width, height and translation overrides that disrupted ChatGPT's New Chat screen and split the sidebar/header.

- Ocean background: the supplied image's bundled pixel rendition is painted behind the app; only chat layout ancestors are made transparent.
- Parchment stage: a pointer-transparent, viewport-anchored painted layer, centered to the right of the sidebar. ChatGPT keeps native message and composer positions and scroll.
- Sidebar: one inset walnut background/frame behind existing controls. No native sidebar width, position, scroll or collapse overrides.
- New Chat: the detector avoids the narrow centered welcome column when selecting the full scene. No forced chat height or margins.
- Composer: simple matching paper writing tray; earlier torn-edge decorations are removed only within the stage.
- Ink and code: brown prose and action icons, with one dark walnut background/cream text scheme for code surfaces.

### Check this experiment

1. git fetch origin
2. git switch experiment/floating-parchment-stage
3. git pull origin experiment/floating-parchment-stage
4. Reload the unpacked extension in chrome://extensions and hard-refresh ChatGPT.
5. Compare a new chat with a long conversation, expanded/collapsed sidebar, code, attachments and narrow window widths.
6. Run node tests/stage-architecture-v129.test.cjs to verify native geometry guards.

Live signed-in browser appearance still requires review before merging. The stable main branch has not been modified.

---

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

## v1.8: VT323 everywhere and readable popover descriptions

- Use the existing extension-loaded VT323 as the default for all ChatGPT text, inputs, buttons, message content and menus, without adjusting layout or SVG icon geometry.
- Improve secondary and muted description contrast on parchment menus, including the ChatGPT/Codex selector. Preserve muted styling of genuinely disabled actions.
- The existing on/off switch controls the global font, and the existing CSP-safe font loader remains unchanged.

Reload the unpacked extension after updating, then hard refresh chatgpt.com.

## v1.9: Parchment composer and neutral accents

The existing message composer is styled as a paper surface with dark brown text, readable placeholder text, and a restrained inset border. Green send/voice action buttons inside the composer use dark walnut brown with cream icons. The existing extension-owned paper fiber SVG (`--pui-resolved-paper`) is reused, with a CSS gradient fallback. No page-relative asset URLs, new observers, layout modifications, or event interception are introduced. The switch in the extension popup also disables composer styling.

The rules live in `src/composer.css`, limited to known ChatGPT composer elements (`#composer-background`, composer test IDs, and the unified-composer form). This avoids changing other forms or message content.

## v1.9.1: Composer targeting fix

v1.9 used only a handful of assumed composer IDs and forms. ChatGPT's input often uses a nested ProseMirror contenteditable element, so the visible rounded composer was never selected. v1.9.1 locates the editor, walks upward a few ancestors to the nearest rounded interactive panel, and applies a marker used by `src/composer.css`. It checks at startup, on editor focus and input, and on resize. There are no continuous timers or full-page mutation observers. Send/voice controls use walnut rather than green; the layout and click actions remain native.

## v1.10: Height-responsive horizontal scroll composer

- Replaces the plain parchment card appearance with original CSS-drawn scroll dowels at both ends. The dowels run from the top to the bottom of the native composer and automatically grow as ChatGPT expands for long prompts or attachment previews.
- Keeps the full native input width, line wrapping, buttons, model picker and event handlers. Scroll ends are visual only (`pointer-events:none`), so no UI behavior is intercepted.
- Removes the dark toolbar surface that could appear with both empty and nonempty prompts, while converting the model/add controls to brown-on-paper and keeping send/voice action circles walnut/cream.
- Uses the existing extension-owned paper-fiber tile and VT323. No external image or stock-photo usage, and no added full-page mutation observer.
- Scopes styling to the composer marker; sidebar and menu styling remain unchanged.

## v1.11: Real pixel-art scroll and live model text

Added genuine transparent pixel-art PNGs from the approved tattered scroll: left wooden end, repeatable parchment center and right wooden end. They're registered as extension assets and referenced with absolute chrome.runtime.getURL paths. The scroll scales with ChatGPT's native composer height. The Medium / other model-effort label remains live VT323 text on a pixel-edged pill, not baked into the image. Existing controls and actions stay native.

## v1.12: Approved-scroll rebuild and attachment/contrast fixes

The prior implementation tiled a strip containing torn borders, stretched the entire roller image, and marked arbitrary dark descendants (including preview surroundings) as toolbar backgrounds. This made the scroll look like repeating wallpaper and allowed attachment previews, model text and action buttons to clash with the art.

This revision uses five **small, genuine pixel-art PNG samples directly derived from the previously approved generated scroll**: left and right roller art, separate top/bottom torn-edge bands, and a seamless parchment fill. No stock-image watermarks or baked-in UI labels are used. The roller art uses CSS border-image slicing, keeping the cap details stable while the middle stretches with the native composer height. The parchment center repeats independently across the width, not its border.

The implementation leaves attachment previews and layout native, does not add a full-page observer, and uses real VT323 text for the model/effort selector. The composer toggle remains controlled by `data-petrifyui-active`.

## v1.13: Simple pixel paper composer (no scroll)

The composer is now a single, responsive **pixel-paper** surface inspired by Foldered and Geekify, not a horizontal scroll illustration. It directly reuses the 256×256 seamless crisp-edge grain tile from `Notagai/geekify/assets/geekify/ui/paper/grain-tile.svg` (copied into this repository), with a compact pixel border, understated bevel and dark ink. There are **no rollers, torn-edge strips, pseudo-scroll sprites or height-stretching images** in the active composer theme.

The script only identifies the native composer, live model selector and the editor's direct structural layers. The inner editor surface becomes transparent; **attachment cards, previews, voice/send actions and layout are not replaced**. Model/effort names like Medium remain live VT323 text with a contrasting paper selector. The paper texture repeats at its native 256px grid, so multiline expansion stays consistent without JavaScript height calculations, intrusive global MutationObservers or a custom DOM composer.

Legacy scroll sprites are superseded and excluded from web-accessible resources. The native ChatGPT composer layout, accessibility roles and event handlers remain in charge.

## v1.14: Stable tattered-paper composer

The v1.13 screenshot exposed two bugs: a broad dark toolbar still remained underneath the input, and the script could reselect a different composer ancestor when the editor grew, making the paper jump or deform. The new code **pins the selected native composer while the editor remains inside it** and does not re-run the full panel-selection heuristic on every keystroke.

The design keeps Geekify's reusable 256×256 paper-grain tile, and adds its genuine, independent `torn-top.svg` and `torn-bottom.svg` pixel edges at fixed 256px repeats. Neither paper nor its edges is stretched as the native composer grows. There are no wooden rollers or flattened scroll sprites.

The toolbar cleaner checks only short, dark, bottom-aligned wrappers inside the selected composer, leaving image attachments, previews, buttons and popovers alone. It removes dark backgrounds without changing element dimensions, padding or event handlers. The Medium selector remains real VT323 text on a light paper chip. All new edge assets are copied from Geekify and bundled in this extension with extension URLs, not page-relative links.

No full-page DOM observer or continuous polling was added. Signed-in visual testing remains necessary.

## v1.15: Composer contrast and focus-black-bar fix

- Muted-text CSS is now scoped to editor text rather than washing out all toolbar elements.
- Added immediate, CSS-only transparent surfaces for native control trays, including focus-triggered dark backgrounds. No delayed JavaScript scan is required to clear the bar.
- Improved contrast for add/attachment, microphone, send, and live VT323 Medium/model selector controls. Disabled actions keep their disabled state.
- Removed JavaScript scanning of toolbar backgrounds on every interaction. Keeps the pinned composer and Geekify pixel-torn paper edges from v1.14.
- No event-handler changes, extra layout measurements or additional DOM observers. Visual verification on signed-in ChatGPT is still required.

## v1.16: Wide Add menu and Thinking effort popup

- Fixes the old menu detector's 450px size limit: the wide Add/attachments menu is now recognized and given a warm paper surface with dark text, muted-brown descriptions and hover highlighting. Native colorful service icons, scroll area, menu actions and layout stay unchanged.
- Adds separate detection for the Thinking effort slider popup, previously excluded from theming. Recolors its paper surface, text and green slider accent to walnut brown while retaining the native slider and buttons.
- Avoids classifying the composer button by a generic `thinking effort` accessibility label. The actual Medium/Instant/High text stays live VT323 and its chevron remains native.
- Only event-triggered popup discovery and a shallow body-portal insertion observer are used. Chat messages and streaming are not observed.

## v1.17: Full Add popover and native-size composer selector

- Recognizes the **entire** Add menu by looking for both early options and one of the lower section entries (Sketch, Spotify, Notion, Cloudflare), rather than styling only the first six entries.
- Clears dark inner panels under the main paper surface so lower integrations stay consistent; keeps provider icon colors, scroll position and native menu interactions.
- Styles the model/effort control with dark ink only, dropping the added border and font geometry that could overlap the Thinking effort label.
- Increases plus/attachment contrast without changing its button size or placement.
- No page-wide observer or chat-content mutations were added; follow-up visual testing is necessary.

## v1.18: Delete chat confirmation

The delete confirmation uses a separate dialog-specific parchment treatment rather than borrowing a menu row style. Cancel is now a light paper button with dark readable text; Delete chat has a dark brick-red fill with cream text to preserve its destructive meaning. The title, description and X control have consistent dark-ink contrast. Native modal sizing, focus trapping, button handlers and confirmation behavior remain unchanged.

### v1.18.1 hotfix

Corrected the Delete button's exact-label matcher and strengthened specificity so shared menu color rules cannot override cream text on the destructive red button.

### v1.18.1 Thinking effort correction

The previous effort-popup detector selected the smallest slider-containing element, often an inner wrapper, leaving the outer dark popup and green track unthemed. The detector now prioritizes the visible rounded/painted popup shell, with an event-driven fallback for slider implementations without an explicit ARIA role. Added focused paper, ink, slider-track, fill and thumb color rules, without changing layout, slider behavior or keyboard accessibility. Live signed-in appearance still requires confirmation.

## v1.19: Slight universal font increase and effort-label cleanup

- Increased the root font size to 106.25% of the browser default (typically 16px to 17px). This improves the relative-size, rem-based VT323 typography without recursively boosting nested elements or forcing every heading/label to the same absolute pixel size.
- The "Medium" effort selector keeps its live VT323 label, but its text descendants now have consistent font weight and no duplicate shadow/stroke/animation effects. It retains ChatGPT's native button sizing, chevron, padding and event handlers.
- No change to paper textures, menu discovery, popup geometry or the existing compact-sidebar logic. Text hardcoded in px by ChatGPT may not scale with root sizing.
- Because the exact source of overlapping text cannot be confirmed from screenshots alone, the selector needs a real browser visual check after updating.


## Experimental branch: floating parchment stage (v1.28)

**Branch:** `experiment/floating-parchment-stage` (not merged into `main`). This experiment layers a low-contrast, locally bundled pixel-art study background behind the UI; paints a centered parchment page behind the existing chat messages and composer; and gives the outer sidebar a small desktop-only margin, frame, and shadow. The right side of the background has a deliberately subtle window, shelf and plant as an ambient focal point. No new functionality or buttons are introduced.

The scene uses `src/stage.js`, `src/stage.css`, and `assets/stage/study-ambient.svg`. All new styles are gated behind `html[data-petrifyui-active]` and apply only on conversation and new-chat routes. ChatGPT still owns navigation, scrolling, inputs, attachments and message layout. A lightweight event-driven refresh identifies the chat main and outer sidebar; the ambient image itself is static with no animations.

### Test this branch

```powershell
 git fetch origin
 git switch experiment/floating-parchment-stage
```

Reload the unpacked extension in `chrome://extensions`, hard-refresh `https://chatgpt.com`, and test new chats, long chats, sidebar collapsed/expanded, attachment menus and smaller window widths. Return to `main` with `git switch main`. Keep it experimental until the signed-in browser visuals are reviewed.

## Experimental branch v1.28.2: ocean layout repair

Replaced the old pixel study backdrop with a compact 128×72 indexed-color pixel rendition resampled from the user-supplied 2048×1152 ocean image. The original uploaded image is not hosted; the bundled asset is a visually faithful low-resolution pixel-art rendering. The floating chat panel now paints parchment on the actual selected chat container, rather than a narrow pseudo-element that left black areas exposed. Expanded the paper surface up to 1160px, maintained a full-viewport-height minimum, recolored assistant markdown to dark ink and user bubbles to muted parchment-brown, and added fallback wood borders on the sidebar's real outer container. No new widgets, scrolling overrides or click interceptions. This is still a browser visual experiment, not merged to main.

## Experiment v1.28.3: coherent floating surfaces and contrast

These changes remain on `experiment/floating-parchment-stage`; stable `main` is unchanged.

- **Floating sidebar:** added a visible 12px horizontal inset, walnut edge, and shadow, with separate size rules depending on whether the header is nested in the sidebar or rendered separately
- **Black ChatGPT header:** a lightweight detector tags the real top-left toolbar (including after sidebar remounts) and reapplies the wood asset; its large structural child backgrounds become transparent
- **Black footer strips:** identified wide native wrappers around the composer and cleared only those structural backgrounds and pseudo-elements
- **Input redesign:** uses a darker, inset paper writing tray with a plain border; the old torn paper top/bottom overlays are suppressed on the parchment stage
- **Text/icons:** assistant prose and explicit white text tokens become dark walnut ink; message action SVGs become readable brown
- **Code blocks:** code heading, body, inner surfaces, and code lettering use a single dark walnut / cream palette, including wrappers with a direct `<pre>` child

New CSS is consolidated in `src/stage.css`, overriding rather than duplicating the previous experimental rules. Existing chat layout, links, keyboard navigation, and sidebar interactions remain native. The fixes are structurally checked, but a signed-in browser visual pass is still necessary before merging.

### v1.28.4 header remount guard

Some ChatGPT builds independently remount the header while the sidebar is unchanged. A child-list observer watches only the current header's immediate parent and reacquires its wood-textured root. It does not observe chat messages or run periodic scans. The experiment is still not verified in the signed-in ChatGPT browser.

## Experimental v1.29.2: text contrast and black bottom composer

Diagnostics from browser screenshot and branch CSS:
- The v1.29.1 pseudo-class exclusions had a newline/space separating `:is(...)` from `:not(...)`. That changed their meaning from filtering the intended element to selecting another descendant, so white text survived and some wrong elements could be affected.
- The original composer theme depended on `[data-petrifyui-composer]` inside `[data-pui-main-stage]`, even though ChatGPT's footer can be mounted outside that stage. The composer selector could also disappear after remounting.

Changes: removed the malformed contrast block; used directly attached pseudo-class exclusions on assistant text only; added a separate composer-tray detector in `stage.js`; and painted the detected editor tray directly, with native element fallbacks. Dark user bubbles and code colors are not newly overridden. The background and layout geometry are unchanged.

Run `node tests/stage-contrast-composer-v1292.test.cjs` for static regression checks. These do not prove the live ChatGPT layout is correct; confirm in browser before merging.
