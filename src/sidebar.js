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
  let brandTrigger = null;
  let enabled = true;
  let queued = false;

  let woodAssetChecked = false;
  function configureWoodAsset() {
    if (typeof chrome === "undefined" || typeof chrome.runtime?.getURL !== "function") return;
    const url = chrome.runtime.getURL("assets/walnut-wood-v3.svg");
    // CSS custom properties can resolve relative URLs against the page when
    // substituted. Supply an absolute chrome-extension:// URL instead.
    document.documentElement.style.setProperty("--pui-resolved-wood", 'url("' + url + '")');
    if (woodAssetChecked) return;
    woodAssetChecked = true;
    const probe = new Image();
    probe.onload = () => {
      document.documentElement.dataset.petrifyuiTexture = "loaded";
    };
    probe.onerror = () => {
      document.documentElement.dataset.petrifyuiTexture = "failed";
      // The CSS gradient under the asset is a deliberate, always-visible fallback.
      document.documentElement.style.setProperty("--pui-resolved-wood", "none");
      console.warn("[PetrifyUI] Wood asset failed to load; using CSS grain fallback.", url);
    };
    probe.src = url;
  }

  const rectOf = element => element.getBoundingClientRect();

  function findSidebar() {
    for (const selector of ROOT_SELECTORS) {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLElement)) continue;
      const bounds = rectOf(element);
      if (bounds.width < 42 || bounds.height < 110) continue;
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


  /* Style only the native ChatGPT/Codex picker near the sidebar header. */
  function findBrandTrigger(toolbar) {
    if (!toolbar) return null;
    const nodes = toolbar.querySelectorAll('button, a, [role="button"], [aria-haspopup]');
    return [...nodes].find(el => {
      const label = (el.textContent || "").replace(/\s+/g, " ").trim();
      return /^(ChatGPT|Codex)(\s|$)/i.test(label) && rectOf(el).width < 220;
    }) || null;
  }

  /* Popovers often have a transparent portal wrapper and an opaque nested panel.
     Choose the actual panel rather than putting a border around its wrapper. */
  function loadVT323() {
    if (document.getElementById("petrifyui-vt323-font")) return;
    const font = document.createElement("link");
    font.id = "petrifyui-vt323-font";
    font.rel = "stylesheet";
    font.href = "https://fonts.googleapis.com/css2?family=VT323&display=swap";
    document.head.appendChild(font);
  }


  /**
   * ChatGPT paints large opaque wrappers over the sidebar's background.
   * Clear only those broad layout panels; leave links, project cards, avatars
   * and selected rows to ChatGPT's own styling.
   */
  function clearSidebarUnderlays(sidebar) {
    const outer = rectOf(sidebar);
    const minW = outer.width * .78;
    const minH = Math.min(110, outer.height * .2);
    for (const el of sidebar.querySelectorAll("div, section, nav, aside")) {
      if (!(el instanceof HTMLElement)) continue;
      const box = rectOf(el);
      const broad = box.width >= minW && box.height >= minH &&
        box.left >= outer.left - 10 && box.right <= outer.right + 10 &&
        box.top >= outer.top - 8 && box.bottom <= outer.bottom + 12;
      if (!broad) {
        if (el.hasAttribute("data-petrifyui-underlay")) el.removeAttribute("data-petrifyui-underlay");
        continue;
      }
      // Mark structural wrappers consistently. Checking computed background after
      // adding the class would make the marker toggle on every rerender.
      el.setAttribute("data-petrifyui-underlay", "");
    }
  }


  /**
   * Find the native 30–56px clickable row around a chat/project link.
   * In the live UI, the link may only be as wide as its title while an enclosing
   * div owns the whole row. Never style entire Recents or Projects groups.
   */
  function nearestRow(item, sidebar) {
    const bounds = rectOf(sidebar);
    for (let el=item, depth=0; el && el!==sidebar && depth<7; el=el.parentElement,depth++) {
      if (!(el instanceof HTMLElement)) continue;
      const r=rectOf(el);
      if (r.width < bounds.width * .67 || r.width > bounds.width + 6 ||
          r.height < 25 || r.height > 58) continue;
      if (r.left < bounds.left-8 || r.right > bounds.right+8) continue;
      // A row can have an overflow button, but never a second conversation link.
      const links=[...el.querySelectorAll('a[href^="/c/"],a[href^="/g/"],a[href^="/projects"]')];
      if (links.length>1) continue;
      return el;
    }
    return item;
  }

  function decorateRows(sidebar) {
    const collapsed = rectOf(sidebar).width <= 85;
    sidebar.toggleAttribute("data-petrifyui-collapsed",collapsed);

    // Clean up old markers to avoid placing parchment behind old wrappers.
    for(const el of sidebar.querySelectorAll('[data-petrifyui-row],[data-petrifyui-row-kind],[data-petrifyui-selected]')){
      el.removeAttribute("data-petrifyui-row");
      el.removeAttribute("data-petrifyui-row-kind");
      el.removeAttribute("data-petrifyui-selected");
    }
    for (const el of sidebar.querySelectorAll('[data-petrifyui-paper]')) el.removeAttribute('data-petrifyui-paper');

    if (!collapsed) {
      for(const item of sidebar.querySelectorAll('a[href],button,[role="button"]')){
        if (!(item instanceof HTMLElement)) continue;
        const label=(item.textContent||"").trim();
        // Section headings can be buttons. They must never become paper cards.
        if (/^(Projects|Recents)(\s*[⌄▾∨])?$/.test(label)) continue;
        let type=null, pathname=null;
        if(item.tagName==="A"){
          try {pathname=new URL(item.getAttribute("href"),document.baseURI).pathname;}catch{continue;}
          if(/^\/c\//.test(pathname)) type="chat";
          else if(/^\/(g|projects?)(\/|$)/.test(pathname)) type="project";
          else if(label) type="nav";
        } else if (/^(New chat|Scheduled|Library|Plugins|Explore)$/i.test(label) ||
                  item.getAttribute("data-testid")==="create-new-chat-button") type="nav";
        if(!type) continue;
        const row=nearestRow(item,sidebar);
        if(!(row instanceof HTMLElement)) continue;
        row.setAttribute("data-petrifyui-row","");
        row.setAttribute("data-petrifyui-row-kind",type);
        if(item.getAttribute("aria-current")==="page" ||
           item.getAttribute("data-active")==="true" ||
           (pathname && pathname!=="/" && pathname===location.pathname)) {
          row.setAttribute("data-petrifyui-selected","");
        }
      }
    }
    for(const el of sidebar.querySelectorAll('h2,h3,span,[role="heading"]')){
      if (!(el instanceof HTMLElement)) continue;
      const label=(el.textContent||"").trim();
      const isHeading=el.childElementCount===0 && /^(Projects|Recents)$/.test(label) &&
        rectOf(el).height>=10;
      el.toggleAttribute("data-petrifyui-section-title",isHeading);
    }
  }

  function changeTracked(previous, next, marker) {
    if (previous !== next) previous?.removeAttribute(marker);
    if (next) next.setAttribute(marker, "");
  }

  function render() {
    queued = false;
    loadVT323();
    configureWoodAsset();
    const nextRoot = findSidebar();
    if (!nextRoot) {
      changeTracked(root, null, "data-petrifyui-sidebar");
      changeTracked(header, null, "data-petrifyui-header");
      changeTracked(scroller, null, "data-petrifyui-scroll");
      changeTracked(brandTrigger, null, "data-petrifyui-brand-trigger");
      root = header = scroller = brandTrigger = null;
      return;
    }
    const nextHeader = findHeader(nextRoot);
    const nextScroller = findScroller(nextRoot);
    const nextBrandTrigger = findBrandTrigger(nextHeader);
    changeTracked(root, nextRoot, "data-petrifyui-sidebar");
    changeTracked(header, nextHeader, "data-petrifyui-header");
    changeTracked(scroller, nextScroller, "data-petrifyui-scroll");
    changeTracked(brandTrigger, nextBrandTrigger, "data-petrifyui-brand-trigger");
    root = nextRoot;
    header = nextHeader;
    scroller = nextScroller;
    brandTrigger = nextBrandTrigger;

    for (const surface of [root, header, brandTrigger]) {
      if (!surface) continue;
      if (enabled) surface.setAttribute("data-petrifyui-enabled", "");
      else surface.removeAttribute("data-petrifyui-enabled");
    }
    decorateRows(root);
    clearSidebarUnderlays(root);
  }

  function scheduleRender() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(render);
  }

  const observer = new MutationObserver(records => {
    if (!root?.isConnected || !header?.isConnected || records.some(record =>
      root?.contains(record.target) || root?.parentElement === record.target ||
      header?.parentElement === record.target ||
      record.target === document.body ||
      (record.target instanceof Element && record.target.hasAttribute("data-radix-popper-content-wrapper"))
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
