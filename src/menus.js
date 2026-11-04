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
  const menuShells=new Set();
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
  function findSlashMenu(){
    const words=["Dictate","Feedback","Model","Read aloud","Study"];
    const matches=el=>words.filter(w=>(el.textContent||"").includes(w)).length>=4;
    let result=null,bestArea=Infinity;
    const consider=el=>{
      if(!(el instanceof HTMLElement)||!visiblePopup(el,1080,760)||!matches(el))return;
      const r=geometry(el);
      if(!r||r.width<220||r.height<120||el.closest('[data-petrifyui-composer]'))return;
      const area=r.width*r.height;
      if(area<bestArea){result=el;bestArea=area;}
    };
    for(const el of document.querySelectorAll(OPEN))consider(el);
    if(result)return result;
    let checked=0;
    for(const el of document.querySelectorAll('button,[role="option"],[role="menuitem"],[cmdk-item]')){
      if(checked++>700)break;
      if(!/^\s*(Dictate|Feedback|Model|Read aloud|Study)\b/i.test(el.textContent||""))continue;
      for(let n=el.parentElement,d=0;n&&d<10;n=n.parentElement,d++)consider(n);
    }
    return result;
  }
  function markMenuShells(menus){
    const next=new Set();
    for(const menu of menus){
      const rect=geometry(menu);
      if(!rect)continue;
      for(let p=menu.parentElement,d=0;p&&d<4;p=p.parentElement,d++){
        if(!(p instanceof HTMLElement)||p===document.body)break;
        const r=geometry(p);
        if(!r||Math.abs(r.width-rect.width)>40||Math.abs(r.height-rect.height)>40)break;
        next.add(p);
      }
    }
    for(const el of menuShells)if(!next.has(el))el.removeAttribute("data-pui-menu-shell");
    menuShells.clear();
    for(const el of next){el.setAttribute("data-pui-menu-shell","");menuShells.add(el);}
  }
  function findEffortPopup(){
    // Identify the actual *painted popover shell*, not a small slider child.
    // The previous smallest-area search often themed only a slider wrapper,
    // leaving the dark outer popup and green track exposed.
    const sliders=[
      ...document.querySelectorAll(
        '[role="slider"],input[type="range"],[data-slot*="slider-track"],[data-radix-slider-track]'
      )
    ].filter(x=>x instanceof HTMLElement && geometry(x));
    const options=[];
    function consider(candidate,slider,depth){
      if(!visiblePopup(candidate,480,360)||
         !candidate.contains(slider)||
         candidate.closest('[data-petrifyui-composer]'))return;
      const r=geometry(candidate);
      if(r.width<170||r.height<70||r.width>480||r.height>360)return;
      const text=(candidate.textContent||"").trim().replace(/\s+/g," ");
      // Popover should describe a single effort selection, not a full
      // settings modal containing an unrelated slider.
      if(!/\b(instant|medium|high|extra high|thinking effort)\b/i.test(text))return;
      const style=getComputedStyle(candidate);
      const radius=parseFloat(style.borderTopLeftRadius)||0;
      const color=style.backgroundColor;
      const painted=color!=="transparent"&&color!=="rgba(0, 0, 0, 0)";
      const isPopup=candidate.matches(
        '[role="dialog"],[role="menu"],[data-radix-popper-content-wrapper],'+
        '[data-side],[data-slot*="popover"]'
      );
      const hasControls=!!candidate.querySelector('button,[role="button"],[role="slider"]');
      // Prefer a rounded, painted panel that encloses the slider and title.
      // Bigger than the slider wrapper, but smaller than the portal/page.
      const score=(isPopup?40:0)+(painted?35:0)+(radius>=8?25:0)+
        (hasControls?8:0)+Math.min(r.height,160)*.04-depth*.9-
        Math.max(0,r.width-340)*.2;
      options.push({candidate,score,r});
    }
    for(const slider of sliders){
      for(let node=slider.parentElement,depth=0;node&&depth<9;node=node.parentElement,depth++){
        if(node===document.body)break;
        consider(node,slider,depth);
      }
    }
    // Some ChatGPT builds render a custom slider with no semantic role.
    // Fall back to open popover shells with an effort label plus a slider-like track.
    if(!options.length){
      for(const popup of document.querySelectorAll(OPEN)){
        if(!(popup instanceof HTMLElement)||!visiblePopup(popup,480,360))continue;
        const text=(popup.textContent||"").trim().replace(/\s+/g," ");
        if(!/\b(instant|medium|high|extra high|thinking effort)\b/i.test(text))continue;
        const track=popup.querySelector(
          '[class*="slider" i],[class*="range" i],[data-slot*="slider"],input[type="range"]'
        );
        if(track)consider(popup,track,0);
      }
    }
    options.sort((x,y)=>y.score-x.score);
    return options[0]?.candidate||null;
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
      const slash=findSlashMenu();
      const confirmation=findDeleteConfirmation();
      for(const el of findNormalMenus()) {
        if(el===add||el===effort||el===slash||el===confirmation||
           (add&&(el.contains(add)||add.contains(el)))||
           (effort&&(el.contains(effort)||effort.contains(el)))||
           (slash&&(el.contains(slash)||slash.contains(el)))||
           (confirmation&&(el.contains(confirmation)||confirmation.contains(el))))continue;
        next.set(el,"normal");
      }
      if(add)next.set(add,"add");
      if(slash)next.set(slash,"slash");
      if(effort)next.set(effort,"effort");
      if(confirmation)next.set(confirmation,"confirm");
    }
    markDestructive(next.size ? [...next.entries()].find(([node,kind])=>kind==="confirm")?.[0] : null);
    markMenuShells([...next].filter(([,kind])=>kind==="add"||kind==="slash").map(([el])=>el));
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
  document.addEventListener("input",e=>{
    if(e.target instanceof Element&&e.target.closest('[contenteditable="true"],textarea,input'))afterInteraction();
  },{passive:true});
  document.addEventListener("keydown",event=>{
    if(["Enter"," ","Escape","ArrowDown","ArrowUp","ArrowLeft","ArrowRight","/"].includes(event.key))
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
