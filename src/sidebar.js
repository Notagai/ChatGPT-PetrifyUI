/* PetrifyUI 1.6: zero sidebar DOM scanning.
   React can replace sidebar nodes at any time; CSS targets them directly. */
(() => {
  "use strict";
  const html=document.documentElement;
  if (html.hasAttribute("data-petrifyui-script")) return;
  html.setAttribute("data-petrifyui-script","");
  const lowPower=matchMedia("(prefers-reduced-motion: reduce)").matches ||
    navigator.connection?.saveData===true ||
    (typeof navigator.deviceMemory==="number"&&navigator.deviceMemory<=4) ||
    (typeof navigator.hardwareConcurrency==="number"&&navigator.hardwareConcurrency<=4);
  html.toggleAttribute("data-petrifyui-low-power",lowPower);

  // Default enabled, updated immediately when the local preference arrives.
  // This flag is on <html>, which React doesn't swap when rerendering the sidebar.
  html.setAttribute("data-petrifyui-active","");

  function applyPreference(enabled){
    html.toggleAttribute("data-petrifyui-active",enabled!==false);
  }

  async function addAsset(name,property,status) {
    const url=chrome.runtime.getURL("assets/"+name);
    html.style.setProperty(property, 'url("'+url+'")');
    try {
      const image=new Image();
      await new Promise((resolve,reject)=>{
        image.onload=()=>resolve();
        image.onerror=()=>reject(new Error("Image resource failed"));
        image.src=url;
      });
      html.dataset[status]="loaded";
    } catch {
      // A normal extension-owned fetch can work when direct image embedding is blocked.
      try {
        const result=await fetch(url);
        if(!result.ok) throw new Error("HTTP "+result.status);
        const svg=await result.text();
        const data="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg);
        html.style.setProperty(property,'url("'+data+'")');
        html.dataset[status]="loaded-data";
      }catch{
        html.style.setProperty(property,"none");
        html.dataset[status]="fallback";
      }
    }
  }

  // Locate the existing top-left toolbar by its rendered bounds.
  // Restrict inspection to ancestors of a point in the left header; do not
  // scan ChatGPT's chat tree and never modify the toolbar's controls.
  let header=null, headerFrameQueued=false;
  function findHeader() {
    if(document.hidden || !document.body)return null;
    const el=document.elementFromPoint(18,24);
    if(!el)return null;
    for(let n=el,steps=0;n&&n!==document.body&&steps<12;n=n.parentElement,steps++){
      if(!(n instanceof HTMLElement))continue;
      const r=n.getBoundingClientRect();
      const eligible=r.left>=-6&&r.left<=20&&r.top>=-4&&r.top<=12&&
        r.width>=220&&r.width<=430&&r.height>=40&&r.height<=75;
      if(!eligible)continue;
      const hasControls=n.querySelectorAll('button,[role="button"],a[href]').length>=2;
      if(hasControls)return n;
    }
    return null;
  }
  function refreshHeader() {
    headerFrameQueued=false;
    const next=findHeader();
    if(next!==header){
      header?.removeAttribute("data-petrifyui-topbar");
      header=next;
    }
    header?.setAttribute("data-petrifyui-topbar","");
  }
  function queueHeader() {
    if(headerFrameQueued||document.hidden)return;
    headerFrameQueued=true;
    requestAnimationFrame(refreshHeader);
  }
  function delayedHeaderCheck() {
    queueHeader();
    setTimeout(queueHeader,200);
    setTimeout(queueHeader,750);
  }

  function loadFont(){
    chrome.runtime.sendMessage({type:"petrifyui-font-vt323"},async result=>{
      if(chrome.runtime.lastError||!result?.ok||!Array.isArray(result.bytes)){
        html.dataset.petrifyuiFont="fallback";
        return;
      }
      try {
        const face=new FontFace("Petrify VT323",new Uint8Array(result.bytes).buffer,
          {weight:"400",style:"normal"});
        document.fonts.add(await face.load());
        html.dataset.petrifyuiFont="loaded";
      }catch{html.dataset.petrifyuiFont="fallback";}
    });
  }
  chrome.storage.local.get({enabled:true},settings=>applyPreference(settings.enabled));
  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area==="local"&&changes.enabled)applyPreference(changes.enabled.newValue);
  });
  void addAsset("walnut-wood-v3.svg","--pui-resolved-wood","petrifyuiTexture");
  void addAsset("paper-fiber-v2.svg","--pui-resolved-paper","petrifyuiPaper");
  loadFont();
  // Small, event-driven header checks for React's sidebar transitions.
  if(document.readyState==="loading")
    document.addEventListener("DOMContentLoaded",delayedHeaderCheck,{once:true});
  else delayedHeaderCheck();
  document.addEventListener("click",event=>{
    const el=event.target;
    if(el instanceof Element && el.closest(
      'button[aria-label*="sidebar" i],button[title*="sidebar" i],'+
      '[data-testid="sidebar-toggle"],[data-testid="sidebar-button"]'
    )) delayedHeaderCheck();
  },{passive:true});
  window.addEventListener("resize",queueHeader,{passive:true});
  document.addEventListener("visibilitychange",()=>{
    if(!document.hidden)queueHeader();
  });
})();
