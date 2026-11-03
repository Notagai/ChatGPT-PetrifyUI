/* PetrifyUI: sidebar discovery. No DOM content, layout, links or handlers are changed. */
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
  let currentRoot = null;
  let enabled = true;
  let updateQueued = false;

  function looksLikeSidebar(element) {
    if (!(element instanceof HTMLElement)) return false;
    if (element.id === "stage-slideover-sidebar" || element.id === "sidebar") return true;
    return Boolean(element.querySelector(
      '[data-testid="create-new-chat-button"], a[href^="/c/"], a[href^="/g/"], a[href^="/projects"]'
    ));
  }

  function findSidebar() {
    for (const selector of ROOT_SELECTORS) {
      const element = document.querySelector(selector);
      if (element && looksLikeSidebar(element)) return element;
    }
    return null;
  }

  function highlightCurrentChat(root) {
    const currentPath = window.location.pathname.replace(/\/+$/, "") || "/";
    for (const a of root.querySelectorAll("a[href]")) {
      let current = false;
      try {
        const link = new URL(a.href, location.href);
        current = link.origin === location.origin &&
          (link.pathname.replace(/\/+$/, "") || "/") === currentPath &&
          currentPath !== "/";
      } catch {
        // Malformed links are ignored; originals are never touched.
      }
      if (current) a.setAttribute("data-petrifyui-current", "");
      else a.removeAttribute("data-petrifyui-current");
    }
  }

  function render() {
    updateQueued = false;
    const root = findSidebar();
    if (currentRoot !== root) {
      currentRoot?.removeAttribute("data-petrifyui-sidebar");
      currentRoot?.removeAttribute("data-petrifyui-enabled");
      currentRoot = root;
    }
    if (!root) return;
    root.setAttribute("data-petrifyui-sidebar", "");
    if (enabled) root.setAttribute("data-petrifyui-enabled", "");
    else root.removeAttribute("data-petrifyui-enabled");
    highlightCurrentChat(root);
  }

  function scheduleRender() {
    if (updateQueued) return;
    updateQueued = true;
    window.requestAnimationFrame(render);
  }

  // Detect sidebar replacement without rescanning every streamed chat update.
  const observer = new MutationObserver(records => {
    if (!currentRoot?.isConnected || records.some(record => currentRoot?.contains(record.target))) {
      scheduleRender();
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener("popstate", scheduleRender);
  window.addEventListener("hashchange", scheduleRender);
  window.addEventListener("resize", scheduleRender, { passive: true });
  document.addEventListener("click", event => {
    if (!currentRoot?.contains(event.target)) return;
    window.setTimeout(scheduleRender, 120);
  }, { passive: true });

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
