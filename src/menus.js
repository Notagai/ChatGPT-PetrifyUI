/* PetrifyUI: restyle existing ChatGPT popovers and menus, never replace their content. */
(() => {
  "use strict";

  const SELECTORS = [
    '[role="menu"]',
    '[role="listbox"]',
    '[data-radix-popper-content-wrapper]',
    '[data-radix-dropdown-menu-content]',
    '[data-radix-context-menu-content]',
    '[data-radix-select-content]',
    '[data-slot="dropdown-menu-content"]',
    '[data-slot="context-menu-content"]',
    '[data-slot="select-content"]',
    '[data-slot="popover-content"]',
    '[data-side][data-state="open"]',
    '[data-popper-placement]',
    '[data-state="open"][role="dialog"]',
    '[cmdk-root]',
    '[data-testid*="dropdown"]',
    '[data-testid*="popover"]'
  ].join(",");
  const ITEMS = '[role="menuitem"],[role="menuitemcheckbox"],[role="menuitemradio"],[role="option"],button,a,[cmdk-item]';
  const PANELS = 'div,section,nav,ul,[role="menu"],[role="listbox"]';

  let enabled = true;
  let scheduled = false;
  let marked = new Set();

  function visibleBox(el) {
    if (!(el instanceof HTMLElement)) return null;
    const r = el.getBoundingClientRect();
    if (r.width < 112 || r.width > 580 || r.height < 55 ||
        r.height > Math.max(680, innerHeight * 0.90) ||
        r.right < 0 || r.left > innerWidth || r.bottom < 0 || r.top > innerHeight) return null;
    const style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return null;
    return r;
  }

  function looksPainted(el) {
    const style = getComputedStyle(el);
    if (style.backgroundImage !== "none") return true;
    const bg = style.backgroundColor.replace(/\s/g, "");
    if (bg && bg !== "transparent" && !bg.endsWith(",0)")) return true;
    return style.boxShadow !== "none";
  }

  // A settings card with sliders/toggles is not a menu.
  // This prevents styling the Thinking effort control as parchment.
  function isSettingsPopover(el) {
    return !!el.querySelector('input[type="range"],[role="slider"],[role="switch"]');
  }

  function choosePanel(seed) {
    const alternatives = [seed, ...seed.querySelectorAll(PANELS)].slice(0, 70);
    let winner = null;
    let score = -Infinity;

    for (const el of alternatives) {
      if (el.matches(ITEMS) || isSettingsPopover(el)) continue;
      const bounds = visibleBox(el);
      if (!bounds) continue;
      const actionCount = el.querySelectorAll(ITEMS).length;
      const role = el.getAttribute("role");
      const isMenu = role === "menu" || role === "listbox" ||
        el.matches('[data-slot$="menu-content"],[data-slot="select-content"],[data-radix-dropdown-menu-content],[data-radix-context-menu-content]');
      const brandMenu = /ChatGPT/.test(el.textContent || "") && /Codex/.test(el.textContent || "");
      if (actionCount < 2 && !isMenu && !brandMenu) continue;

      const directClickable = [...el.children].filter(child =>
        child.matches?.(ITEMS) || child.querySelector?.(ITEMS)
      ).length;
      const painted = looksPainted(el);
      let depth = 0, parent = el;
      while ((parent = parent.parentElement) && depth < 35) depth++;
      const area = bounds.width * bounds.height;
      const value = (painted ? 85 : 0) + (isMenu ? 34 : 0) +
        (directClickable > 1 ? 18 : 0) + Math.min(24, depth * .5) -
        area * .000025;
      if (value > score) { score = value; winner = el; }
    }
    return winner;
  }

  function findMenus() {
    const found = new Set();
    for (const seed of document.querySelectorAll(SELECTORS)) {
      if (!visibleBox(seed) || isSettingsPopover(seed)) continue;
      const panel = choosePanel(seed);
      if (panel) found.add(panel);
    }
    return found;
  }

  function decorateUnderlays(panel) {
    const outer = panel.getBoundingClientRect();
    // A popup can have several nested opaque panels, not just direct children.
    // Never strip backgrounds from the individual actions.
    for (const child of panel.querySelectorAll('div,section,nav,ul')) {
      if (!(child instanceof HTMLElement) || child.matches(ITEMS)) continue;
      const b = child.getBoundingClientRect();
      const coversMenu = b.width >= outer.width * .78 &&
        b.height >= outer.height * .67 &&
        b.left >= outer.left - 8 && b.right <= outer.right + 8 &&
        b.top >= outer.top - 8 && b.bottom <= outer.bottom + 8;
      if (coversMenu && child.querySelectorAll(ITEMS).length >= 1) {
        child.setAttribute("data-petrifyui-menu-underlay", "");
      } else {
        child.removeAttribute("data-petrifyui-menu-underlay");
      }
    }
  }

  function apply() {
    scheduled = false;
    const next = enabled ? findMenus() : new Set();
    for (const old of marked) {
      if (!next.has(old)) {
        old.removeAttribute("data-petrifyui-menu");
        old.removeAttribute("data-petrifyui-enabled");
        old.querySelectorAll("[data-petrifyui-menu-underlay]").forEach(
          el => el.removeAttribute("data-petrifyui-menu-underlay")
        );
      }
    }
    for (const panel of next) {
      panel.setAttribute("data-petrifyui-menu", "");
      panel.setAttribute("data-petrifyui-enabled", "");
      decorateUnderlays(panel);
    }
    marked = next;
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(apply);
  }

  const observer = new MutationObserver(records => {
    if (records.some(r => r.type === "childList" ?
      [...r.addedNodes, ...r.removedNodes].some(n => n.nodeType === Node.ELEMENT_NODE) :
      r.attributeName !== "data-petrifyui-menu")) schedule();
  });
  observer.observe(document.documentElement, {
    subtree: true, childList: true, attributes: true,
    attributeFilter: ["data-state", "aria-hidden", "hidden", "style", "class"]
  });

  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    chrome.storage.local.get({ enabled: true }, values => {
      enabled = values.enabled !== false;
      schedule();
    });
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && changes.enabled) {
        enabled = changes.enabled.newValue !== false;
        schedule();
      }
    });
  }
  schedule();
})();
