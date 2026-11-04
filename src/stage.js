/* Experimental floating parchment stage, v1.28.1.
   No changes to native chat controls or message content. */
(() => {
  "use strict";
  const html=document.documentElement;
  const COMPOSER='#prompt-textarea,[data-testid="prompt-textarea"],[contenteditable="true"][role="textbox"]';
  const SIDEBAR='#sidebar,[data-testid="sidebar-container"],[data-testid="sidebar"],#stage-slideover-sidebar,[data-testid="sidebar-mini"],[data-testid="sidebar-collapsed"],[data-testid="collapsed-sidebar"]';
  const MESSAGE='#thread,[data-testid^="conversation-turn"],[data-message-author-role]';
  const MAIN='main,[role="main"],#main';
  html.style.setProperty('--pui-ambient-art',
    'url("'+chrome.runtime.getURL('assets/stage/ocean-pixel.png')+'")');
  html.style.setProperty('--pui-stage-paper',
    'url("'+chrome.runtime.getURL('assets/composer/paper-grain-geekify.svg')+'")');
  let stage=null,sidebar=null,queued=false,observer=null;
  const shellMarks=new Set();

  function routeAllowed(){
    const path=location.pathname;
    return /^\/(?:$|c\/|g\/|project\/|projects\/)/.test(path);
  }
  function rect(el){
    if(!(el instanceof HTMLElement)||!el.isConnected)return null;
    const r=el.getBoundingClientRect();
    const cs=getComputedStyle(el);
    if(cs.display==='none'||cs.visibility==='hidden'||
       r.width<35||r.height<20||r.right<0||r.bottom<0)return null;
    return r;
  }
  function findSidebar(){
    const options=[...document.querySelectorAll(SIDEBAR)].filter(x=>rect(x));
    return options.find(node=>!options.some(other=>other!==node&&other.contains(node)))||options[0]||null;
  }
  function findStage(nav){
    if(!routeAllowed())return null;
    const editor=[...document.querySelectorAll(COMPOSER)].find(el=>rect(el));
    const thread=[...document.querySelectorAll(MESSAGE)].find(el=>rect(el));
    const seed=editor||thread;
    if(!seed)return null;

    // Prefer actual native main. Some ChatGPT versions omit that tag, so
    // walk up from the visible composer and select a viewport-sized ancestor
    // that does not enclose the sidebar. No dependency on generated classnames.
    for(const el of [editor,thread]){
      const main=el?.closest(MAIN);
      if(rect(main)&&!main.contains(nav))return main;
    }
    const candidates=[];
    for(let node=seed.parentElement,depth=0;node&&node!==document.body&&depth<18;
        node=node.parentElement,depth++){
      const r=rect(node);
      if(!r||node.contains(nav)||r.width<Math.min(460,innerWidth*.50)||
         r.height<innerHeight*.52)continue;
      const score=r.height/innerHeight*40+r.width/innerWidth*15+
        (r.top<=90?20:0)+(r.bottom>=innerHeight-45?20:0)+depth*.4;
      candidates.push({node,score});
    }
    candidates.sort((a,b)=>b.score-a.score);
    return candidates[0]?.node||null;
  }
  function updateShells(panel){
    const next=new Set();
    if(panel){
      // Remove only full-size, opaque structural coatings between message
      // rows and their paper stage; never flatten text cards or code blocks.
      for(const seed of [panel.querySelector(MESSAGE),panel.querySelector(COMPOSER)]){
        for(let el=seed?.parentElement,depth=0;el&&el!==panel&&depth<9;
            el=el.parentElement,depth++){
          const r=rect(el),base=rect(panel);
          if(!r||!base||r.width<base.width*.55||r.height<base.height*.35)continue;
          if(el.matches('[role="dialog"],[role="menu"],[role="listbox"]'))continue;
          next.add(el);
        }
      }
    }
    for(const el of shellMarks)if(!next.has(el))el.removeAttribute('data-pui-stage-shell');
    shellMarks.clear();
    for(const el of next){el.setAttribute('data-pui-stage-shell','');shellMarks.add(el);}
  }
  function update(){
    queued=false;
    if(document.hidden)return;
    const nextSidebar=findSidebar();
    const nextStage=findStage(nextSidebar);
    if(stage!==nextStage)stage?.removeAttribute('data-pui-main-stage');
    if(sidebar!==nextSidebar)sidebar?.removeAttribute('data-pui-floating-sidebar');
    stage=nextStage;sidebar=nextSidebar;
    stage?.setAttribute('data-pui-main-stage','');
    sidebar?.setAttribute('data-pui-floating-sidebar','');
    html.toggleAttribute('data-pui-stage-ready',!!stage);
    html.setAttribute('data-pui-stage-status',stage?'ready':'no-chat-stage');
    html.dataset.puiStageRevision='ocean-v1282';
    updateShells(stage);
  }
  function schedule(){
    if(queued||document.hidden)return;
    queued=true;requestAnimationFrame(update);
  }
  function resync(){
    schedule();
    setTimeout(schedule,160);
    setTimeout(schedule,700);
    setTimeout(schedule,1900);
  }
  function bindMountObserver(){
    // Observe only immediate children of the native application root for
    // chat creation/remounts; don't scan streamed message mutations.
    if(observer||!document.body)return;
    const root=document.querySelector('#__next,#root,[data-testid="chatgpt-app"]')||document.body;
    observer=new MutationObserver(records=>{
      if(records.some(r=>[...r.addedNodes,...r.removedNodes].some(n=>n.nodeType===1)))
        schedule();
    });
    observer.observe(root,{childList:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{
    bindMountObserver();resync();
  },{once:true});
  else {bindMountObserver();resync();}
  document.addEventListener('click',event=>{
    if(event.target instanceof Element&&event.target.closest(
      'a[href],button[aria-label*="sidebar" i],button[title*="sidebar" i]'
    ))resync();
  },{passive:true});
  document.addEventListener('focusin',event=>{
    if(event.target instanceof Element&&event.target.closest(COMPOSER))schedule();
  },{passive:true});
  window.addEventListener('popstate',resync,{passive:true});
  window.addEventListener('resize',schedule,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)resync();});
  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area==='local'&&changes.enabled)schedule();
  });
})();
