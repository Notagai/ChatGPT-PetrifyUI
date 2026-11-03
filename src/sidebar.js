/* PetrifyUI: detect and decorate existing sidebar surfaces. Never replace UI elements. */
(() => {
  "use strict";

  const ROOT_SELECTORS = [
    "#stage-slideover-sidebar", "#sidebar", '[data-testid="sidebar"]',
    '[data-testid="sidebar-container"]', 'nav[aria-label="Chat history"]',
    'nav[aria-label="Sidebar"]'
  ];
  const RAIL_SELECTORS = [
    '[data-testid="sidebar-mini"]',
    '[data-testid="sidebar-collapsed"]',
    '[data-testid="collapsed-sidebar"]',
    '#sidebar',
    '[data-testid="sidebar"]',
    '[data-testid="sidebar-container"]'
  ];

  let root = null, header = null, scroller = null, brandTrigger = null, rail = null;
  let enabled = true, queued = false, lastRootWidth = -1, lastRootHeight = -1;
  const markedRows = new Set();
  const markedUnderlays = new Set();
  const markedHeadings = new Set();
  const lightweight = (
    matchMedia("(prefers-reduced-motion: reduce)").matches ||
    navigator.connection?.saveData === true ||
    (typeof navigator.deviceMemory === "number" && navigator.deviceMemory <= 4) ||
    (typeof navigator.hardwareConcurrency === "number" && navigator.hardwareConcurrency <= 4)
  );
  document.documentElement.toggleAttribute("data-petrifyui-low-power",lightweight);

  // Resolve extension assets explicitly. Never use chatgpt.com/assets.
  let assetsStarted=false, fontStarted=false;
  function probeImage(url) {
    return new Promise((resolve,reject)=>{
      const image=new Image();
      image.onload=resolve;
      image.onerror=()=>reject(new Error("Image blocked or unavailable"));
      image.src=url;
    });
  }
  async function loadAsset(name, cssVariable, stateName) {
    const uri=chrome.runtime.getURL("assets/"+name);
    const root=document.documentElement;
    root.style.setProperty(cssVariable,'url("'+uri+'")');
    try {
      await probeImage(uri);
      root.dataset[stateName]="loaded";
    } catch {
      try {
        // Fetch from our extension directly, then let the browser render a data URI.
        const response=await fetch(uri);
        if(!response.ok)throw new Error("HTTP "+response.status);
        const svg=await response.text();
        const data="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg);
        await probeImage(data);
        root.style.setProperty(cssVariable,'url("'+data+'")');
        root.dataset[stateName]="loaded-data";
      } catch(err) {
        root.style.setProperty(cssVariable,"none");
        root.dataset[stateName]="fallback";
        console.warn("[PetrifyUI] Local asset unavailable; CSS fallback active:",name,err);
      }
    }
  }
  function configureAssets() {
    if(assetsStarted||!chrome?.runtime?.getURL)return;
    assetsStarted=true;
    void Promise.all([
      loadAsset("walnut-wood-v3.svg","--pui-resolved-wood","petrifyuiTexture"),
      loadAsset("paper-fiber-v2.svg","--pui-resolved-paper","petrifyuiPaper"),
      loadAsset("brand-mark.svg","--pui-resolved-brand","petrifyuiBrand")
    ]);
  }
  function loadVT323() {
    if(fontStarted||!chrome?.runtime?.sendMessage)return;
    fontStarted=true;
    // The extension worker downloads font bytes; no stylesheet is injected
    // into ChatGPT, so its style-src policy cannot block the font.
    chrome.runtime.sendMessage({type:"petrifyui-font-vt323"},async result=>{
      if(chrome.runtime.lastError||!result?.ok||!Array.isArray(result.bytes)){
        document.documentElement.dataset.petrifyuiFont="fallback";
        return;
      }
      try {
        const face=new FontFace("Petrify VT323",new Uint8Array(result.bytes).buffer,{weight:"400",style:"normal"});
        const loaded=await face.load();
        document.fonts.add(loaded);
        document.documentElement.dataset.petrifyuiFont="loaded";
      } catch(err) {
        document.documentElement.dataset.petrifyuiFont="fallback";
        console.warn("[PetrifyUI] Could not register VT323 font:",err);
      }
    });
  }

  const rectOf = element => element.getBoundingClientRect();

  function findSidebar() {
    for (const selector of ROOT_SELECTORS) {
      const el = document.querySelector(selector);
      if (!(el instanceof HTMLElement)) continue;
      const r=rectOf(el);
      if (r.width < 39 || r.height < 110 || r.left > 100) continue;
      if (el.id === "stage-slideover-sidebar" || el.id === "sidebar") return el;
      if (el.querySelector('[data-testid="create-new-chat-button"],a[href^="/c/"],a[href^="/g/"]')) return el;
    }
    return null;
  }

  // Compact rails may live outside the full sidebar tree. Only match actual
  // sidebar navigation; don't touch its toggle, tooltip, or native click handler.
  function findCollapsedRail(sidebar) {
    if (sidebar && rectOf(sidebar).width > 95) return null;
    for (const selector of RAIL_SELECTORS) {
      const el=document.querySelector(selector);
      if (!(el instanceof HTMLElement)) continue;
      const r=rectOf(el);
      if (r.width < 39 || r.width > 95 || r.height < innerHeight*.45 ||
          r.left > 30 || r.top > 120) continue;
      if (!el.querySelector('button,a,[role="button"]')) continue;
      return el;
    }
    // ChatGPT sometimes renders the collapsed rail with no stable test ID.
    // Find a narrow nav near the left viewport edge, but avoid generic dialog UI.
    for (const el of document.querySelectorAll('nav,aside')) {
      if (!(el instanceof HTMLElement) || el.closest('[role="dialog"],[role="menu"]')) continue;
      const r=rectOf(el);
      if (r.width < 39 || r.width > 95 || r.height < innerHeight*.55 ||
          r.left > 25 || r.top > 100) continue;
      if (el.querySelectorAll('button,a,[role="button"]').length < 3) continue;
      return el;
    }
    return sidebar && rectOf(sidebar).width <= 95 ? sidebar : null;
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
    // Prefer real overflow containers rather than measuring every descendant.
    const candidates=[sidebar,...sidebar.querySelectorAll('[class*="overflow-y"],[class*="scroll"],[data-testid*="scroll"]')];
    for (const el of candidates) {
      if (!(el instanceof HTMLElement) || el.clientHeight < 140) continue;
      if (el.scrollHeight <= el.clientHeight+10) continue;
      if (/auto|scroll/.test(getComputedStyle(el).overflowY)) return el;
    }
    return null;
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


  /**
   * ChatGPT paints large opaque wrappers over the sidebar's background.
   * Clear only those broad layout panels; leave links, project cards, avatars
   * and selected rows to ChatGPT's own styling.
   */
  function reconcileMarkers(oldSet,nextSet,attribute) {
    for (const el of oldSet) if (!nextSet.has(el)) el.removeAttribute(attribute);
    for (const el of nextSet) if (!el.hasAttribute(attribute)) el.setAttribute(attribute,"");
    oldSet.clear();
    for (const el of nextSet) oldSet.add(el);
  }
  function clearSidebarUnderlays(sidebar) {
    const outer=rectOf(sidebar);
    const next=new Set();
    for (const el of sidebar.querySelectorAll('div,section,nav,aside')) {
      if (!(el instanceof HTMLElement)) continue;
      const r=rectOf(el);
      if (r.width >= outer.width*.78 && r.height >= Math.min(110,outer.height*.2) &&
          r.left >= outer.left-10 && r.right <= outer.right+10 &&
          r.top >= outer.top-8 && r.bottom <= outer.bottom+12) next.add(el);
    }
    reconcileMarkers(markedUnderlays,next,"data-petrifyui-underlay");
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
    const collapsed=rectOf(sidebar).width <= 95;
    sidebar.toggleAttribute("data-petrifyui-collapsed",collapsed);
    const rows=new Set(), headings=new Set();
    if (!collapsed) {
      for(const item of sidebar.querySelectorAll('a[href],button,[role="button"]')) {
        if (!(item instanceof HTMLElement)) continue;
        const label=(item.textContent||"").trim();
        if (/^(Projects|Recents)(\s*[⌄▾∨])?$/.test(label)) continue;
        let type=null,pathname=null;
        if(item.tagName==="A") {
          try {pathname=new URL(item.getAttribute("href"),document.baseURI).pathname;}
          catch {continue;}
          if(/^\/c\//.test(pathname))type="chat";
          else if(/^\/(g|projects?)(\/|$)/.test(pathname))type="project";
          else if(label)type="nav";
        } else if (/^(New chat|Scheduled|Library|Plugins|Explore)$/i.test(label) ||
                   item.getAttribute("data-testid")==="create-new-chat-button")type="nav";
        if(!type)continue;
        const row=nearestRow(item,sidebar);
        if(!(row instanceof HTMLElement))continue;
        rows.add(row);
        if(row.getAttribute("data-petrifyui-row-kind")!==type)
          row.setAttribute("data-petrifyui-row-kind",type);
        const selected=item.getAttribute("aria-current")==="page" ||
          item.getAttribute("data-active")==="true" ||
          !!(pathname&&pathname!=="/"&&pathname===location.pathname);
        row.toggleAttribute("data-petrifyui-selected",selected);
      }
    }
    for(const el of sidebar.querySelectorAll('h2,h3,span,[role="heading"]')) {
      if(!(el instanceof HTMLElement))continue;
      if(el.childElementCount===0&&/^(Projects|Recents)$/.test((el.textContent||"").trim())&&rectOf(el).height>=10)
        headings.add(el);
    }
    for(const previous of markedRows)if(!rows.has(previous)){
      previous.removeAttribute("data-petrifyui-row-kind");
      previous.removeAttribute("data-petrifyui-selected");
    }
    reconcileMarkers(markedRows,rows,"data-petrifyui-row");
    reconcileMarkers(markedHeadings,headings,"data-petrifyui-section-title");
  }

  function changeTracked(previous, next, marker) {
    if (previous !== next) previous?.removeAttribute(marker);
    if (next) next.setAttribute(marker, "");
  }

  function render() {
    queued=false;
    if(document.visibilityState==="hidden") return;
    loadVT323();
    configureAssets();
    const nextRoot=findSidebar();
    const nextRail=findCollapsedRail(nextRoot);
    const expanded=nextRoot&&rectOf(nextRoot).width>95;
    const nextHeader=expanded?findHeader(nextRoot):null;
    const nextScroller=expanded?findScroller(nextRoot):null;
    const nextBrandTrigger=expanded?findBrandTrigger(nextHeader):null;
    if(root!==nextRoot) {
      reconcileMarkers(markedRows,new Set(),"data-petrifyui-row");
      reconcileMarkers(markedHeadings,new Set(),"data-petrifyui-section-title");
      reconcileMarkers(markedUnderlays,new Set(),"data-petrifyui-underlay");
      lastRootWidth=-1;lastRootHeight=-1;
    }
    changeTracked(root,nextRoot,"data-petrifyui-sidebar");
    changeTracked(header,nextHeader,"data-petrifyui-header");
    changeTracked(scroller,nextScroller,"data-petrifyui-scroll");
    changeTracked(brandTrigger,nextBrandTrigger,"data-petrifyui-brand-trigger");
    changeTracked(rail,nextRail,"data-petrifyui-rail");
    root=nextRoot;header=nextHeader;scroller=nextScroller;
    brandTrigger=nextBrandTrigger;rail=nextRail;
    for(const el of [root,header,brandTrigger,rail]){
      if(!el)continue;
      el.toggleAttribute("data-petrifyui-enabled",enabled);
    }
    if(!root||!enabled)return;
    const size=rectOf(root);
    if(size.width<=95){
      root.toggleAttribute("data-petrifyui-collapsed",true);
      return; // Only icons remain; never restructure them.
    }
    root.removeAttribute("data-petrifyui-collapsed");
    if(!lightweight||size.width!==lastRootWidth||size.height!==lastRootHeight){
      clearSidebarUnderlays(root);
    }
    decorateRows(root);
    lastRootWidth=size.width;lastRootHeight=size.height;
  }
  function scheduleRender(){
    if(queued||document.visibilityState==="hidden")return;
    queued=true;
    requestAnimationFrame(render);
  }
  // Watch structural changes only. Our data-* markers never trigger the observer.
  const observer=new MutationObserver(records=>{
    if(records.some(r=>{
      if(r.type!=="childList")return false;
      if(!root?.isConnected||!rail?.isConnected)return true;
      return r.target===document.body||r.target===document.documentElement||
        root?.contains(r.target)||header?.contains(r.target)||
        r.target?.contains?.(root)||r.target?.contains?.(rail);
    }))scheduleRender();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener("popstate",scheduleRender);
  window.addEventListener("hashchange",scheduleRender);
  window.addEventListener("resize",scheduleRender,{passive:true});
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")scheduleRender();});

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
