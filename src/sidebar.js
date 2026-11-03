/* PetrifyUI 1.5: small, event-driven sidebar skin. No DOM layout edits. */
(() => {
  "use strict";
  const SIDEBAR = [
    "#stage-slideover-sidebar", "#sidebar",
    '[data-testid="sidebar"]', '[data-testid="sidebar-container"]'
  ].join(",");
  const RAIL = [
    '[data-testid="sidebar-mini"]', '[data-testid="sidebar-collapsed"]',
    '[data-testid="collapsed-sidebar"]'
  ].join(",");
  const COLLAPSED_MAX = 100;
  let active = true, current = null, compact = null, watchParent = null;
  let pending = false, fallbackTimer = null, parentObserver = null;
  let resizeObserver = null, loadedFont = false, loadedAssets = false;
  const doc = document.documentElement;
  const isLowPower = matchMedia("(prefers-reduced-motion: reduce)").matches ||
    navigator.connection?.saveData === true ||
    (navigator.deviceMemory !== undefined && navigator.deviceMemory <= 4) ||
    (navigator.hardwareConcurrency !== undefined && navigator.hardwareConcurrency <= 4);
  doc.toggleAttribute("data-petrifyui-low-power", isLowPower);

  function validSide(el) {
    if (!(el instanceof HTMLElement)) return false;
    const r = el.getBoundingClientRect();
    return r.left >= -8 && r.left < 90 && r.width >= 40 &&
      r.width <= 410 && r.height >= Math.min(innerHeight * .45, 290);
  }
  function findSide() {
    for (const el of document.querySelectorAll(SIDEBAR)) if (validSide(el)) return el;
    return null;
  }
  function findRail(side) {
    if (side && side.getBoundingClientRect().width <= COLLAPSED_MAX) return side;
    if (side && side.getBoundingClientRect().width > COLLAPSED_MAX) return null;
    for (const el of document.querySelectorAll(RAIL)) if (validSide(el) &&
      el.getBoundingClientRect().width <= COLLAPSED_MAX) return el;
    // A very narrow nav/aside at the left edge can be the native compact rail.
    for (const el of document.querySelectorAll("nav,aside")) {
      if (!validSide(el) || el.getBoundingClientRect().width > COLLAPSED_MAX) continue;
      if (el.closest('[role="dialog"],[role="menu"]')) continue;
      if (el.querySelectorAll("button,a,[role='button']").length >= 3) return el;
    }
    return null;
  }
  function setMarker(el,name,yes) {
    if (el) el.toggleAttribute(name,yes);
  }
  function setSurface(side,rail) {
    if (current !== side) {
      current?.removeAttribute("data-petrifyui-sidebar");
      current?.removeAttribute("data-petrifyui-enabled");
      current?.removeAttribute("data-petrifyui-collapsed");
      current = side;
    }
    if (compact !== rail) {
      if (compact !== current) {
        compact?.removeAttribute("data-petrifyui-rail");
        compact?.removeAttribute("data-petrifyui-enabled");
      }
      compact = rail;
    }
    const collapsed = !!side && side.getBoundingClientRect().width <= COLLAPSED_MAX;
    setMarker(side,"data-petrifyui-sidebar",true);
    setMarker(side,"data-petrifyui-collapsed",collapsed);
    setMarker(side,"data-petrifyui-enabled",active);
    if (rail && rail !== side) {
      setMarker(rail,"data-petrifyui-rail",true);
      setMarker(rail,"data-petrifyui-enabled",active);
    }
    // Nothing touches header buttons, tooltips, sidebar toggle, widths or visibility.
  }
  function watch(side,rail) {
    const ancestor=(side||rail)?.parentElement || null;
    if (ancestor === watchParent) return;
    parentObserver?.disconnect();
    resizeObserver?.disconnect();
    watchParent=ancestor;
    if (!ancestor) return;
    parentObserver=new MutationObserver(() => queue());
    parentObserver.observe(ancestor,{childList:true});
    resizeObserver=new ResizeObserver(() => queue());
    if(side) resizeObserver.observe(side);
    if(rail && rail!==side)resizeObserver.observe(rail);
  }
  function refresh() {
    pending=false;
    if (document.hidden) return;
    const side=findSide(), rail=findRail(side);
    setSurface(side,rail);
    watch(side,rail);
    if (side||rail) {
      if (fallbackTimer !== null) {clearInterval(fallbackTimer);fallbackTimer=null;}
    } else if(fallbackTimer === null) {
      // Rare late React mount: poll lightly until a sidebar exists.
      fallbackTimer=setInterval(queue,1200);
    }
  }
  function queue() {
    if (pending || document.hidden) return;
    pending=true;
    requestAnimationFrame(refresh);
  }

  // Resolve asset URLs in the extension. Never use page-relative CSS URLs.
  async function asset(name,cssVar,status) {
    const url=chrome.runtime.getURL("assets/"+name);
    doc.style.setProperty(cssVar,'url("'+url+'")');
    try {
      const img=new Image();
      await new Promise((resolve,reject)=>{
        img.onload=resolve;img.onerror=reject;img.src=url;
      });
      doc.dataset[status]="loaded";
    } catch {
      // If image CSP blocks extension URLs, extension-owned fetch -> SVG data URI.
      try {
        const res=await fetch(url);if(!res.ok)throw Error("asset "+res.status);
        const data="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(await res.text());
        doc.style.setProperty(cssVar,'url("'+data+'")');
        doc.dataset[status]="loaded-data";
      } catch {
        doc.style.setProperty(cssVar,"none");
        doc.dataset[status]="fallback";
      }
    }
  }
  function initAssets() {
    if(loadedAssets)return;
    loadedAssets=true;
    void asset("walnut-wood-v3.svg","--pui-resolved-wood","petrifyuiTexture");
    void asset("paper-fiber-v2.svg","--pui-resolved-paper","petrifyuiPaper");
  }
  function initFont() {
    if(loadedFont)return;loadedFont=true;
    chrome.runtime.sendMessage({type:"petrifyui-font-vt323"},async response=>{
      if(chrome.runtime.lastError || !response?.ok || !Array.isArray(response.bytes)) {
        doc.dataset.petrifyuiFont="fallback";return;
      }
      try {
        const font=new FontFace("Petrify VT323",
          new Uint8Array(response.bytes).buffer,{weight:"400",style:"normal"});
        document.fonts.add(await font.load());
        doc.dataset.petrifyuiFont="loaded";
      } catch {doc.dataset.petrifyuiFont="fallback";}
    });
  }
  // Only light discovery work on actual interaction, not streamed chat updates.
  document.addEventListener("click",event=>{
    const t=event.target;
    if(t instanceof Element && (t.closest(SIDEBAR+","+RAIL) ||
      t.closest('button[aria-label*="sidebar" i],button[title*="sidebar" i]'))) {
      queue();
      // React transitions may finish after the click frame.
      setTimeout(queue,180);
    }
  },{passive:true});
  window.addEventListener("popstate",queue);
  window.addEventListener("hashchange",queue);
  window.addEventListener("resize",queue,{passive:true});
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)queue();});
  // React root replacement, not mutations of individual streamed chat messages.
  const bodyObserver=new MutationObserver(records=>{
    if(records.some(r=>r.addedNodes.length||r.removedNodes.length))queue();
  });
  if(document.body)bodyObserver.observe(document.body,{childList:true});
  chrome.storage.local.get({enabled:true},v=>{
    active=v.enabled!==false;
    initAssets();initFont();queue();
  });
  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area==="local"&&changes.enabled){active=changes.enabled.newValue!==false;queue();}
  });
  queue();
})();
