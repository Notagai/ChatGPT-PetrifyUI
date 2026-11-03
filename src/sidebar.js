/* PetrifyUI: detect and decorate existing sidebar surfaces. Never replace UI elements. */
(() => {
  "use strict";

  const ROOT_SELECTORS = [
    "#stage-slideover-sidebar",
    "#sidebar",
    '[data-testid="sidebar"]',
    '[data-testid="sidebar-container"]',
    'nav[aria-label="Chat history"]',
    'nav[aria-label="Sidebar"]'
  ];

  let root = null;
  let header = null;
  let scroller = null;
  let enabled = true;
  let queued = false;

  const rectOf = element => element.getBoundingClientRect();

  function findSidebar() {
    for (const selector of ROOT_SELECTORS) {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLElement)) continue;
      const bounds = rectOf(element);
      if (bounds.width < 120 || bounds.height < 110) continue;
      if (element.id === "stage-slideover-sidebar" || element.id === "sidebar") return element;
      if (element.querySelector('[data-testid="create-new-chat-button"], a[href^="/c/"], a[href^="/g/"], a[href^="/projects"]')) return element;
    }
    return null;
  }

  /**
   * The ChatGPT toolbar sometimes lives outside the sidebar.
   * Find the bar by geometry without moving nodes or intercepting clicks.
   * If ambiguous, leave the bar unthemed rather than alter chat content.
   */
  function findHeader(sidebar) {
    const side = rectOf(sidebar);
    if (!side.width) return null;
    const x = side.left + Math.min(48, Math.max(16, side.width * 0.14));
    const y = side.top >= 44 ? side.top - 22 : side.top + 22;
    if (y < 0 || y >= window.innerHeight) return null;
    let node = document.elementFromPoint(x, y);
    while (node && node !== document.body && node !== document.documentElement) {
      if (node instanceof HTMLElement && node !== sidebar) {
        const box = rectOf(node);
        const fitsWidth = box.width >= side.width * 0.76 && box.width <= side.width + 20;
        const fitsHeight = box.height >= 34 && box.height <= 88;
        const fitsColumn = box.left >= side.left - 12 && box.right <= side.right + 12;
        const fitsTop = box.top >= -10 && box.top <= side.top + 25;
        if (fitsWidth && fitsHeight && fitsColumn && fitsTop) return node;
      }
      node = node.parentElement;
    }
    return null;
  }

  function findScroller(sidebar) {
    const bounds = rectOf(sidebar);
    const list = [sidebar, ...sidebar.querySelectorAll("*")];
    const matches = list.filter(element => {
      if (!(element instanceof HTMLElement)) return false;
      const box = rectOf(element);
      if (box.width < bounds.width * 0.65 || box.height < 140) return false;
      if (element.scrollHeight <= element.clientHeight + 10) return false;
      return /auto|scroll/.test(getComputedStyle(element).overflowY);
    });
    return matches.sort((a, b) => b.clientHeight - a.clientHeight)[0] || null;
  }

  function decorateRows(sidebar) {
    const side = rectOf(sidebar);
    for (const link of sidebar.querySelectorAll('a[href]')) {
      // Keep all native selected/deselected project colors.
      let project = false;
      try {
        const pathname = new URL(link.getAttribute("href"), document.baseURI).pathname;
        project = /^\/(g|project|projects)(\/|$)/.test(pathname);
      } catch { /* Native links remain intact. */ }
      if (project) link.removeAttribute("data-petrifyui-link");
      else link.setAttribute("data-petrifyui-link", "");
      const box = rectOf(link);
      const isRow = !project && box.width >= side.width * 0.55 && box.height >= 25 && box.height <= 76;
      if (isRow) link.setAttribute("data-petrifyui-row", "");
      else link.removeAttribute("data-petrifyui-row");
    }
  }

  function changeTracked(previous, next, marker) {
    if (previous !== next) previous?.removeAttribute(marker);
    if (next) next.setAttribute(marker, "");
  }

  function render() {
    queued = false;
    const nextRoot = findSidebar();
    if (!nextRoot) {
      changeTracked(root, null, "data-petrifyui-sidebar");
      changeTracked(header, null, "data-petrifyui-header");
      changeTracked(scroller, null, "data-petrifyui-scroll");
      root = header = scroller = null;
      return;
    }
    const nextHeader = findHeader(nextRoot);
    const nextScroller = findScroller(nextRoot);
    changeTracked(root, nextRoot, "data-petrifyui-sidebar");
    changeTracked(header, nextHeader, "data-petrifyui-header");
    changeTracked(scroller, nextScroller, "data-petrifyui-scroll");
    root = nextRoot;
    header = nextHeader;
    scroller = nextScroller;

    for (const surface of [root, header]) {
      if (!surface) continue;
      if (enabled) surface.setAttribute("data-petrifyui-enabled", "");
      else surface.removeAttribute("data-petrifyui-enabled");
    }
    decorateRows(root);
  }

  function scheduleRender() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(render);
  }

  const observer = new MutationObserver(records => {
    if (!root?.isConnected || !header?.isConnected || records.some(record =>
      root?.contains(record.target) || root?.parentElement === record.target ||
      header?.parentElement === record.target
    )) scheduleRender();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener("popstate", scheduleRender);
  window.addEventListener("hashchange", scheduleRender);
  window.addEventListener("resize", scheduleRender, { passive: true });

  // No click interception. Original links and controls retain their handlers.
  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    chrome.storage.local.get({ enabled: true }, prefs => {
      enabled = prefs.enabled !== false;
      scheduleRender();
    });
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && changes.enabled) {
        enabled = changes.enabled.newValue !== false;
        scheduleRender();
      }
    });
  }
  scheduleRender();
})();
