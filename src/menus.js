/* PetrifyUI 1.16: style three types of native ChatGPT popovers.
   Normal context menus, wide Add menu, and Thinking effort slider each need
   their own safe surface detection. Never replace native markup/handlers. */
(() => {
  "use strict";
  const OPEN='[role="menu"],[role="listbox"],[role="dialog"],[data-radix-popper-content-wrapper],[data-slot*="popover"],[data-slot*="menu-content"],[data-side][data-state="open"]';
  const ITEMS='[role="menuitem"],[role="option"],[role="menuitemcheckbox"],[role="menuitemradio"],button,a';
  const ADD_LABELS=["Add photos & files","Add from library","Create image"];
  const ADD_LOWER_LABELS=["Sketch","Spotify","Notion","Cloudflare"];
  const styled=new Map();
  const destructiveMarked=new Set();
  let enabled=true,pending=false,delayed=null;

  function geometry(el) {
    if(!(el instanceof HTMLElement)||!el.isConnected)return null;
    const r=el.getBoundingClientRect();
    if(r.width<100||r.height<40||r.left>innerWidth||r.right<0||
       r.top>innerHeight||r.bottom<0)return null;
    return r;
  }
  function visiblePopup(el,limitWidth=1100,limitHeight=Math.max(500,innerHeight*.88)){
    const r=geometry(el);
    if(!r||r.width>limitWidth||r.height>limitHeight)return false;
    const style=getComputedStyle(el);
    return style.display!=="none"&&style.visibility!=="hidden";
  }
  function addLabelsFound(el){
    const text=el.textContent||"";
    return ADD_LABELS.every(label=>text.includes(label));
  }
  function fullAddListFound(el) {
    const text=el.textContent||"";
    return addLabelsFound(el)&&ADD_LOWER_LABELS.some(label=>text.includes(label));
  }
  function findWideAddMenu(){
    // Use a bounded list of likely portal/content elements first, then anchor
    // from one real menu item if ChatGPT uses a nonstandard popover role.
    let best=null,area=Infinity;
    function consider(el){
      // Ignore partial option groups. They caused only the upper half of
      // the attachment menu to get paper styling.
      if(!visiblePopup(el)||!fullAddListFound(el))return;
      const r=geometry(el);
      if(r.width<310||r.height<170)return;
      const a=r.width*r.height;
      if(a<area){area=a;best=el;}
    }
    for(const el of document.querySelectorAll(OPEN)) {
      if(!(el instanceof HTMLElement)||!fullAddListFound(el))continue;
      consider(el);
      for(const child of el.querySelectorAll(":scope > div,:scope > section,:scope > nav"))consider(child);
    }
    if(best)return best;
    // The attachment menu may be a large custom div without role=menu.
    // Search only on interaction, not on streamed chat updates.
    let tested=0;
    for(const candidate of document.querySelectorAll('button,[role="menuitem"],[role="option"]')){
      if(tested++>450)break;
      if(!(candidate instanceof HTMLElement)||!(candidate.textContent||"").includes(ADD_LABELS[0]))continue;
      for(let parent=candidate.parentElement,depth=0;parent&&depth<12;parent=parent.parentElement,depth++){
        if(fullAddListFound(parent))consider(parent);
      }
    }
    return best;
  }
  function findEffortPopup(){
    let best=null,area=Infinity;
    // This is deliberately distinct from normal menus. v1.15 rejected every
    // popup containing a slider, leaving Thinking effort dark.
    for(const slider of document.querySelectorAll('[role="slider"],input[type="range"]')){
      if(!(slider instanceof HTMLElement)||!geometry(slider))continue;
      for(let parent=slider.parentElement,depth=0;parent&&depth<7;parent=parent.parentElement,depth++){
        if(!visiblePopup(parent,440,310))continue;
        const r=geometry(parent);
        if(r.width<150||r.height<68)continue;
        const text=(parent.textContent||"").trim();
        if(!/\b(instant|medium|high|extra high|thinking effort)\b/i.test(text))continue;
        const a=r.width*r.height;
        if(a<area){area=a;best=parent;}
      }
    }
    return best;
  }
  function findDeleteConfirmation(){
    // Only native delete-confirmation dialogs, not the preceding Delete menu
    // entry. The buttons and destructive behavior remain ChatGPT's own.
    let best=null,area=Infinity;
    for(const el of document.querySelectorAll('[role="alertdialog"],[role="dialog"],[data-slot="alert-dialog-content"]')){
      if(!visiblePopup(el,760,520))continue;
      const label=(el.textContent||"").replace(/\s+/g," ").trim();
      if(!/\bdelete chat\??/i.test(label)||
         !/\b(cancel|delete chat)\b/i.test(label))continue;
      const controls=[...el.querySelectorAll('button,[role="button"]')];
      if(!controls.some(b=>/^\s*cancel\s*$/i.test(b.textContent||""))||
         !controls.some(b=>/^\s*delete chat\s*$/i.test(b.textContent||"")))continue;
      const r=geometry(el);
      const value=r.width*r.height;
      if(value<area){best=el;area=value;}
    }
    return best;
  }
  function findNormalMenus(){
    const result=new Set();
    for(const el of document.querySelectorAll(OPEN)){
      if(!visiblePopup(el,650,650))continue;
      if(el.querySelector('[role="slider"],input[type="range"]'))continue;
      if(addLabelsFound(el))continue;
      if(el.closest('[data-petrifyui-composer]'))continue;
      const count=el.querySelectorAll(ITEMS).length;
      if(count<2 && !el.matches('[role="menu"],[role="listbox"]'))continue;
      const r=geometry(el);
      if(r.width<120||r.height<45)continue;
      result.add(el);
    }
    return result;
  }
  function markDestructive(dialog){
    const current=new Set();
    if(dialog)for(const button of dialog.querySelectorAll("button,[role='button']")){
      if(/^\s*delete chat\s*$/i.test(button.textContent||"")){
        button.setAttribute("data-pui-destructive","");
        current.add(button);
      }
    }
    for(const node of destructiveMarked)if(!current.has(node))node.removeAttribute("data-pui-destructive");
    destructiveMarked.clear();
    for(const node of current)destructiveMarked.add(node);
  }
  function reconcile(next){
    for(const [el,kind] of styled)if(!next.has(el)){
      el.removeAttribute("data-pui-menu-kind");
      el.removeAttribute("data-petrifyui-menu");
      el.removeAttribute("data-petrifyui-enabled");
      styled.delete(el);
    }
    for(const [el,kind] of next) {
      el.setAttribute("data-pui-menu-kind",kind);
      el.setAttribute("data-petrifyui-menu","");
      el.setAttribute("data-petrifyui-enabled","");
      styled.set(el,kind);
    }
  }
  function refresh(){
    pending=false;
    if(document.hidden)return;
    const next=new Map();
    if(enabled && document.documentElement.hasAttribute("data-petrifyui-active")) {
      const add=findWideAddMenu();
      const effort=findEffortPopup();
      const confirmation=findDeleteConfirmation();
      for(const el of findNormalMenus()) {
        if(el===add||el===effort||el===confirmation||
           (add&&(el.contains(add)||add.contains(el)))||
           (effort&&(el.contains(effort)||effort.contains(el)))||
           (confirmation&&(el.contains(confirmation)||confirmation.contains(el))))continue;
        next.set(el,"normal");
      }
      if(add)next.set(add,"add");
      if(effort)next.set(effort,"effort");
      if(confirmation)next.set(confirmation,"confirm");
    }
    markDestructive(next.size ? [...next.entries()].find(([node,kind])=>kind==="confirm")?.[0] : null);
    reconcile(next);
  }
  function schedule(){
    if(pending||document.hidden)return;
    pending=true;
    requestAnimationFrame(refresh);
  }
  function afterInteraction(){
    schedule();
    if(delayed!==null)clearTimeout(delayed);
    delayed=setTimeout(()=>{delayed=null;schedule();},110);
  }
  document.addEventListener("pointerup",afterInteraction,{passive:true});
  document.addEventListener("keydown",event=>{
    if(["Enter"," ","Escape","ArrowDown","ArrowUp","ArrowLeft","ArrowRight"].includes(event.key))
      afterInteraction();
  },{passive:true});
  document.addEventListener("pointerover",event=>{
    if(event.target instanceof Element &&
       event.target.closest('[role="menuitem"],[data-pui-menu-kind]'))
      afterInteraction();
  },{passive:true});
  // Native popovers are usually mounted into a direct child portal of body.
  // Observe ONLY top-level portal insertions, never streaming chat mutations.
  if(document.body)new MutationObserver(records=>{
    if(records.some(r=>[...r.addedNodes,...r.removedNodes].some(n=>
      n.nodeType===1 && (
        n.matches?.(OPEN) || n.querySelector?.(OPEN) ||
        n.matches?.("[data-pui-menu-kind]")
      )
    )))schedule();
  }).observe(document.body,{childList:true});
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)schedule();});
  chrome.storage.local.get({enabled:true},prefs=>{
    enabled=prefs.enabled!==false;schedule();
  });
  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area==="local"&&changes.enabled){
      enabled=changes.enabled.newValue!==false;schedule();
    }
  });
})();
