/* PetrifyUI 1.5: style menus on interaction only, never stream updates. */
(() => {
  "use strict";
  const SELECTORS = [
    '[role="menu"]','[role="listbox"]',
    '[data-radix-popper-content-wrapper]',
    '[data-slot="dropdown-menu-content"]',
    '[data-slot="context-menu-content"]',
    '[data-slot="select-content"]',
    '[data-side][data-state="open"]'
  ].join(",");
  const ITEM='[role="menuitem"],[role="option"],button,a';
  let enabled=true,pending=false;
  const tracked=new Set();
  function menuPanel(seed) {
    if(!(seed instanceof HTMLElement))return null;
    const list=[seed,...seed.querySelectorAll(':scope > div,:scope > section')];
    for(const el of list) {
      if(el.querySelector('input[type="range"],[role="slider"],[role="switch"]'))return null;
      const r=el.getBoundingClientRect();
      if(r.width<120||r.width>450||r.height<45||r.height>480)return null;
      if(el.querySelectorAll(ITEM).length>=2 ||
        el.matches('[role="menu"],[role="listbox"]'))return el;
    }
    return null;
  }
  function refresh() {
    pending=false;
    if(document.hidden)return;
    const next=new Set();
    if(enabled)for(const seed of document.querySelectorAll(SELECTORS)){
      const el=menuPanel(seed);if(el)next.add(el);
    }
    for(const el of tracked) if(!next.has(el)){
      el.removeAttribute("data-petrifyui-menu");
      el.removeAttribute("data-petrifyui-enabled");
    }
    for(const el of next) {
      el.setAttribute("data-petrifyui-menu","");
      el.setAttribute("data-petrifyui-enabled","");
    }
    tracked.clear();for(const el of next)tracked.add(el);
  }
  function queue(){
    if(pending||document.hidden)return;
    pending=true;requestAnimationFrame(refresh);
  }
  // Click and keyboard navigation are enough to discover native menus.
  document.addEventListener("pointerup",()=>{
    queue();setTimeout(queue,60);
  },{passive:true});
  document.addEventListener("keydown",e=>{
    if(["Enter"," ","Escape","ArrowDown","ArrowRight","ArrowLeft"].includes(e.key)){
      queue();setTimeout(queue,60);
    }
  },{passive:true});
  document.addEventListener("pointerover",e=>{
    if(e.target instanceof Element && e.target.closest('[data-petrifyui-menu]'))
      setTimeout(queue,60);
  },{passive:true});
  // React often portals new popovers directly into body.
  if(document.body)new MutationObserver(records=>{
    if(records.some(r=>[...r.addedNodes,...r.removedNodes].some(n=>
      n.nodeType===1 && (n.matches?.(SELECTORS) || n.querySelector?.(SELECTORS))
    )))queue();
  }).observe(document.body,{childList:true});
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)queue();});
  chrome.storage.local.get({enabled:true},v=>{enabled=v.enabled!==false;queue();});
  chrome.storage.onChanged.addListener((c,area)=>{
    if(area==="local"&&c.enabled){enabled=c.enabled.newValue!==false;queue();}
  });
})();
