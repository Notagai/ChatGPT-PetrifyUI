/* PetrifyUI 1.10: horizontal parchment-scroll composer.
   Mark native editor/surface and bottom tray; keep React layout and handlers. */
(() => {
  "use strict";
  const EDITOR = '#prompt-textarea,[data-testid="prompt-textarea"],[contenteditable="true"][role="textbox"],textarea[placeholder]';
  const ACTION = [
    'button[data-testid="send-button"]',
    'button[data-testid="composer-submit-button"]',
    'button[data-testid="composer-speech-button"]',
    'button[aria-label*="send" i]',
    'button[aria-label*="voice" i]',
    'button[aria-label*="dictate" i]'
  ].join(",");
  const UI = 'button,[role="button"]';
  const html=document.documentElement;
  let surface=null,scheduled=false,hasLayout=false,knownElements=new Set();

  function bounds(el) {
    if(!(el instanceof HTMLElement))return null;
    const r=el.getBoundingClientRect();
    if(r.width<180 || r.height<28 || r.height>Math.max(600,innerHeight*.75) ||
       r.top>innerHeight || r.bottom<0 || r.right<0 || r.left>innerWidth)return null;
    return r;
  }
  function locateEditor() {
    for(const el of document.querySelectorAll(EDITOR)){
      if(!(el instanceof HTMLElement) ||
         el.closest('[role="dialog"],[role="menu"],[data-petrifyui-menu]'))continue;
      const r=el.getBoundingClientRect();
      if(r.width>=70 && r.height>=12 && r.bottom>innerHeight*.40)return el;
    }
    return null;
  }
  function locateSurface(editor) {
    const er=editor.getBoundingClientRect();
    let best=null,score=-Infinity;
    for(let el=editor.parentElement,depth=0;el && depth<10;el=el.parentElement,depth++){
      if(!(el instanceof HTMLElement)||el===document.body)break;
      const r=bounds(el);
      if(!r || r.width<er.width*.8 || r.top<innerHeight*.18)continue;
      if(el.querySelectorAll(UI).length<1)continue;
      const cs=getComputedStyle(el);
      const rounded=(parseFloat(cs.borderTopLeftRadius)||0)>=12;
      const painted=cs.backgroundImage!=="none" ||
        (cs.backgroundColor!=="transparent" && cs.backgroundColor!=="rgba(0, 0, 0, 0)");
      const native=el.matches('#composer-background,[data-testid="composer-root"],[data-testid="composer-background"],form[data-type="unified-composer"]');
      const distance=Math.abs(r.width-er.width);
      const scoreNow=(native?70:0)+(rounded?32:0)+(painted?14:0)+
        Math.min(el.querySelectorAll(UI).length,6)*3-depth*5-
        Math.max(0,r.height-190)*.22-distance*.018;
      if(scoreNow>score){best=el;score=scoreNow;}
      if(r.height>innerHeight*.58)break;
    }
    return best;
  }
  function clearMarkers(){
    for(const node of knownElements) {
      node.removeAttribute("data-petrifyui-composer-darkbar");
      node.removeAttribute("data-petrifyui-composer-tool");
      node.removeAttribute("data-petrifyui-composer-action");
    }
    knownElements.clear();
  }
  function mark(node,attr){
    if(node && !node.hasAttribute(attr))node.setAttribute(attr,"");
    if(node)knownElements.add(node);
  }
  function isDark(bg){
    const m=/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(bg);
    if(!m)return false;
    return Math.max(+m[1],+m[2],+m[3])<110 && !/,\s*0(?:\.0+)?\s*\)/.test(bg);
  }
  function styleTray(panel) {
    const outer=bounds(panel);
    if(!outer)return;
    const bottom=outer.bottom;
    // Find only small near-bottom toolbars, not the text editor/attachments.
    const candidates=panel.querySelectorAll('div,section,footer,nav,form');
    let scanned=0;
    for(const node of candidates) {
      if(++scanned>140)break;
      if(!(node instanceof HTMLElement)||node===panel)continue;
      const r=node.getBoundingClientRect();
      if(r.height<22 || r.height>85 || r.width<outer.width*.18 ||
         r.width>outer.width+4 || r.bottom<bottom-95 || r.top>bottom ||
         node.closest('[role="menu"],[role="listbox"]'))continue;
      const cs=getComputedStyle(node);
      if(isDark(cs.backgroundColor) ||
         (cs.backgroundImage!=="none" && isDark(cs.backgroundColor))) {
        mark(node,"data-petrifyui-composer-darkbar");
      }
    }
    // Tool colors must remain correct even when the composer is empty.
    for(const button of panel.querySelectorAll(UI)) {
      if(!(button instanceof HTMLElement))continue;
      const r=button.getBoundingClientRect();
      if(r.bottom<bottom-94 || r.top>bottom)continue;
      if(button.matches(ACTION))mark(button,"data-petrifyui-composer-action");
      else mark(button,"data-petrifyui-composer-tool");
    }
  }
  function decorate(){
    scheduled=false;
    if(document.hidden || !html.hasAttribute("data-petrifyui-active")){
      surface?.removeAttribute("data-petrifyui-composer");
      surface=null;
      clearMarkers();return;
    }
    const editor=locateEditor();
    const next=editor?locateSurface(editor):null;
    if(surface!==next){
      surface?.removeAttribute("data-petrifyui-composer");
      clearMarkers();surface=next;
    }
    if(!surface)return;
    if(!surface.hasAttribute("data-petrifyui-composer"))
      surface.setAttribute("data-petrifyui-composer","");
    // No height or width calculations are stored: pseudo-rollers naturally
    // stretch to whatever height ChatGPT gives the composer.
    clearMarkers();
    styleTray(surface);
    hasLayout=true;
  }
  function queue(){
    if(scheduled || document.hidden)return;
    scheduled=true;
    requestAnimationFrame(decorate);
  }
  function startup(){
    queue();
    setTimeout(queue,250);
    setTimeout(queue,950);
  }
  if(document.readyState==="loading")
    document.addEventListener("DOMContentLoaded",startup,{once:true});
  else startup();
  document.addEventListener("focusin",e=>{
    if(e.target instanceof Element &&
      (e.target.matches(EDITOR)||e.target.closest('[data-petrifyui-composer]')))queue();
  },{passive:true});
  document.addEventListener("pointerdown",e=>{
    if(e.target instanceof Element &&
      (e.target.closest('[data-petrifyui-composer]')||e.target.closest(EDITOR)))queue();
  },{passive:true});
  document.addEventListener("input",e=>{
    if(e.target instanceof Element && e.target.matches(EDITOR) && !hasLayout)queue();
  },{passive:true});
  window.addEventListener("resize",queue,{passive:true});
  document.addEventListener("visibilitychange",()=>{
    if(!document.hidden)queue();
  });
  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area==="local"&&changes.enabled)queue();
  });
})();
