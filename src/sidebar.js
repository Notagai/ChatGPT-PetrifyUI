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


  // Find existing sidebar section wrappers, without inserting panels or altering layout.
  const paperGroups = new Set();
  function panelForLabel(sidebar,label) {
    const frame=rectOf(sidebar);
    const labelNode=[...sidebar.querySelectorAll("h2,h3,button,span,[role='heading']")]
      .find(n=>(n.textContent||"").trim()===label&&rectOf(n).height>=10);
    if (!labelNode) return null;
    for(let el=labelNode.parentElement, step=0; el&&el!==sidebar&&step<9; el=el.parentElement,step++){
      const r=rectOf(el), text=el.textContent||"";
      if (r.width<frame.width*.60||r.width>frame.width+4||r.height<70) continue;
      if(label==="Projects"&&text.includes("Recents")) break;
      if(label==="Recents"&&text.includes("Projects")) break;
      const hasItems=label==="Projects"?
        !!el.querySelector('a[href^="/g/"],a[href^="/projects"]'):
        !!el.querySelector('a[href^="/c/"]');
      if(hasItems) return el;
    }
    return null;
  }
  function navPanel(sidebar) {
    const frame=rectOf(sidebar);
    const btn=sidebar.querySelector('[data-testid="create-new-chat-button"]')||
      [...sidebar.querySelectorAll('a,button')].find(el=>/New chat/i.test((el.textContent||"").trim()));
    if(!btn)return null;
    for(let el=btn.parentElement,i=0;el&&el!==sidebar&&i<7;el=el.parentElement,i++){
      const r=rectOf(el),text=el.textContent||"";
      if(r.width>frame.width*.62&&r.height>90&&r.height<380&&
        el.querySelectorAll("a,button").length>=3&&
        !text.includes("Projects")&&!text.includes("Recents")) return el;
    }
    return null;
  }
  function footerPanel(sidebar){
    const frame=rectOf(sidebar);
    const b=[...sidebar.querySelectorAll('button,[role="button"]')]
      .find(el=>rectOf(el).top>frame.bottom-160&&el.querySelector("img"));
    if(!b)return null;
    for(let el=b.parentElement,i=0;el&&el!==sidebar&&i<5;el=el.parentElement,i++){
      const r=rectOf(el);
      if(r.width>frame.width*.6&&r.height>=38&&r.height<=120)return el;
    }
    return null;
  }
  function markPaperGroups(sidebar) {
    const candidate=rectOf(sidebar).width<90?[]:
      [navPanel(sidebar),panelForLabel(sidebar,"Projects"),
       panelForLabel(sidebar,"Recents"),footerPanel(sidebar)];
    const next=new Set(candidate.filter(Boolean));
    for(const previous of paperGroups)if(!next.has(previous))previous.removeAttribute("data-petrifyui-paper");
    for(const element of next)element.setAttribute("data-petrifyui-paper","");
    paperGroups.clear();
    for(const element of next)paperGroups.add(element);
  }

  function decorateRows(sidebar) {
    const side = rectOf(sidebar);
    if (side.width <= 80) sidebar.setAttribute("data-petrifyui-collapsed", "");
    else sidebar.removeAttribute("data-petrifyui-collapsed");
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
    loadVT323();
    const nextRoot = findSidebar();
    if (!nextRoot) {
      changeTracked(root, null, "data-petrifyui-sidebar");
      changeTracked(header, null, "data-petrifyui-header");
      changeTracked(scroller, null, "data-petrifyui-scroll");
      changeTracked(brandTrigger, null, "data-petrifyui-brand-trigger");
      for(const element of paperGroups) element.removeAttribute('data-petrifyui-paper');
      paperGroups.clear();
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
    markPaperGroups(root);
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
