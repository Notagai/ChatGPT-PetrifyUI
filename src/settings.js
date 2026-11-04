/* PetrifyUI Settings adapter v1.33.2.
 * Screens can mount as overlays without /settings pathname. Detect only
 * established settings navigation landmarks. Reuse shared scheduler. */
(() => {
  "use strict";
  const root=document.documentElement;
  let currentMain=null,currentSidebar=null,currentPlan=null;
  const currentFlow=new Set();
  const rect=el=>el instanceof HTMLElement?el.getBoundingClientRect():null;
  function mark(previous,next,name){
    if(previous!==next){previous?.removeAttribute(name);next?.setAttribute(name,"");}
    return next;
  }
  function visible(el){
    const r=rect(el);
    return !!r&&r.width>2&&r.height>2&&r.right>0&&r.bottom>0&&r.left<innerWidth;
  }
  function findNavigation(){
    // An ordinary chat may say "Back to app", so require the settings list
    // landmarks too. Limit the scan to the leftmost quarter of the screen.
    const controls=document.querySelectorAll("a,button,[role='button']");
    let back=null;
    for(const el of controls){
      const r=rect(el);
      if(!r||r.left>Math.min(innerWidth*.28,420)||!visible(el))continue;
      if((el.textContent||"").trim()==="Back to app"){back=el;break;}
    }
    if(!back){
      // Fallback for Settings variants without an exact Back label.
      for(const candidate of document.querySelectorAll("aside,nav")){
        const r=rect(candidate);
        if(!r||r.left>40||r.width>Math.min(480,innerWidth*.38)||
           r.height<innerHeight*.55)continue;
        const labels=candidate.textContent||"";
        if(labels.includes("General")&&labels.includes("Appearance")&&
           labels.includes("Notifications"))return candidate;
      }
      return null;
    }
    for(let parent=back.parentElement,depth=0;parent&&depth<10;parent=parent.parentElement,depth++){
      const r=rect(parent);
      if(!r||r.width>Math.min(innerWidth*.5,550))break;
      const labels=(parent.textContent||"");
      if(labels.includes("Appearance")&&labels.includes("General")&&labels.includes("Notifications"))
        return parent;
    }
    // The Back button can be a sibling of the navigation. Resolve
    // the left-side panel from their shared container and native bounds.
    for(let parent=back.parentElement,depth=0;parent&&depth<14;parent=parent.parentElement,depth++){
      const r=rect(parent);
      if(!r||r.left>30||r.width>Math.min(480,innerWidth*.38))continue;
      if(r.height>innerHeight*.65)return parent;
    }
    const aside=back.closest("aside")||document.querySelector("aside");
    if(aside&&visible(aside))return aside;
    return null;
  }
  function findSettingsMain(sidebar){
    const sr=rect(sidebar);
    const left=sr?.right||Math.min(innerWidth*.28,420);
    const candidates=document.querySelectorAll("main,[role='main'],[class*='settings-content'],[class*='SettingsContent']");
    for(const el of candidates){
      const r=rect(el);
      if(r&&r.left>=left-12&&r.width>=Math.min(500,innerWidth*.35)&&r.height>=innerHeight*.55)
        return el;
    }
    // Find the main pane through the visible settings heading, avoiding
    // the small individual cards and the document-wide app shell.
    for(const el of document.querySelectorAll("h1,h2")){
      if((el.textContent||"").trim()!=="General")continue;
      const hr=rect(el);
      if(!hr||hr.left<left)continue;
      for(let n=el.parentElement,d=0;n&&d<12;n=n.parentElement,d++){
        const r=rect(n);
        if(!r||r.left<left-24||r.width>innerWidth-left+24)break;
        if(r.height>=innerHeight*.7&&r.width>=Math.min(500,innerWidth*.35))
          return n;
      }
    }
    return null;
  }
  function updatePlan(){
    let match=null;
    const candidates=document.querySelectorAll(
      'button[aria-label="Open profile menu"] span,'+
      '[role="menu"] span,[role="dialog"] span,'+
      '[data-radix-popper-content-wrapper] span'
    );
    for(const el of candidates){
      if(el.children.length===0&&(el.textContent||"").trim()==="Plus"&&visible(el)){
        match=el;break;
      }
    }
    currentPlan=mark(currentPlan,match,"data-pui-plan-label");
  }
  function update(){
    updatePlan();
    const sidebar=findNavigation();
    const detected=!!sidebar||/^\/settings(?:\/|$)/i.test(location.pathname);
    root.toggleAttribute("data-pui-settings",detected);
    currentSidebar=mark(currentSidebar,sidebar,"data-pui-settings-sidebar");
    const main=detected?findSettingsMain(sidebar):null;
    currentMain=mark(currentMain,main,"data-pui-settings-main");
    const nextFlow=new Set();
    if(main){
      for(const heading of main.querySelectorAll("h1,h2")){
        if((heading.textContent||"").trim()!=="General")continue;
        for(let n=heading.parentElement,d=0;n&&n!==main&&d<10;n=n.parentElement,d++)
          nextFlow.add(n);
        break;
      }
    }
    for(const element of currentFlow)
      if(!nextFlow.has(element))element.removeAttribute("data-pui-settings-flow");
    currentFlow.clear();
    for(const element of nextFlow){
      element.setAttribute("data-pui-settings-flow","");
      currentFlow.add(element);
    }
  }
  globalThis.PetrifyCore?.register("settings",update);
})();
