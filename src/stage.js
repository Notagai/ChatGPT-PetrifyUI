/* PetrifyUI experimental floating parchment scene.
   Only decorates existing ChatGPT containers. No DOM replacement or page overlays
   that intercept clicks, and no observation of streamed message content. */
(() => {
  "use strict";
  const html=document.documentElement;
  html.style.setProperty(
    "--pui-ambient-art",
    'url("'+chrome.runtime.getURL("assets/stage/study-ambient.svg")+'")'
  );
  html.style.setProperty(
    "--pui-stage-paper",
    'url("'+chrome.runtime.getURL("assets/composer/paper-grain-geekify.svg")+'")'
  );
  const NAV="main,[role='main'],#main";
  const SIDEBAR="#sidebar,[data-testid='sidebar-container'],[data-testid='sidebar'],#stage-slideover-sidebar,[data-testid='sidebar-mini'],[data-testid='sidebar-collapsed'],[data-testid='collapsed-sidebar']";
  const COMPOSER="#prompt-textarea,[data-testid='prompt-textarea']";
  let stage=null,sidebar=null,queued=false;

  function chatRoute(){
    // Chat pages, a new-chat landing, and GPT conversations. Do not restyle
    // Settings, Library, image viewer or other fullscreen application surfaces.
    return /^\/(?:$|c\/|g\/|project\/|projects\/)/.test(location.pathname);
  }
  function isShown(el){
    if(!(el instanceof HTMLElement))return false;
    const style=getComputedStyle(el);
    return style.display!=="none" && style.visibility!=="hidden" &&
      el.getBoundingClientRect().width>35;
  }
  function findMain(){
    if(!chatRoute())return null;
    const thread=document.querySelector(
      '#thread,[data-testid="conversation-turn-0"],[data-message-author-role]'
    );
    const editor=document.querySelector(COMPOSER);
    const root=thread?.closest(NAV) || editor?.closest(NAV);
    if(isShown(root))return root;
    // The landing page can have a composer before its first message.
    return [...document.querySelectorAll(NAV)].find(el=>
      isShown(el)&&el.querySelector(COMPOSER)
    )||null;
  }
  function findSidebar(){
    // Prefer the outer desktop sidebar container, not nested navigation rows.
    const nodes=[...document.querySelectorAll(SIDEBAR)].filter(isShown);
    if(!nodes.length)return null;
    return nodes.find(el=>!nodes.some(other=>other!==el && other.contains(el)))||nodes[0];
  }
  function refresh(){
    queued=false;
    if(document.hidden)return;
    const nextStage=findMain(),nextSidebar=findSidebar();
    if(nextStage!==stage){
      stage?.removeAttribute("data-pui-main-stage");
      stage=nextStage;
    }
    if(nextSidebar!==sidebar){
      sidebar?.removeAttribute("data-pui-floating-sidebar");
      sidebar=nextSidebar;
    }
    stage?.setAttribute("data-pui-main-stage","");
    sidebar?.setAttribute("data-pui-floating-sidebar","");
  }
  function schedule(){
    if(queued||document.hidden)return;
    queued=true;
    requestAnimationFrame(refresh);
  }
  function afterNavigation(){
    schedule();
    setTimeout(schedule,180);
    setTimeout(schedule,650);
  }
  if(document.readyState==="loading")
    document.addEventListener("DOMContentLoaded",afterNavigation,{once:true});
  else afterNavigation();
  // ChatGPT is an SPA: native click/navigation events are sufficient for
  // normal routing. No repeated intervals and no entire-chat MutationObserver.
  document.addEventListener("click",event=>{
    if(event.target instanceof Element &&
      event.target.closest('a[href],button[aria-label*="sidebar" i],button[title*="sidebar" i]'))
      afterNavigation();
  },{passive:true});
  document.addEventListener("focusin",event=>{
    if(event.target instanceof Element && event.target.closest(COMPOSER))
      schedule();
  },{passive:true});
  window.addEventListener("popstate",afterNavigation,{passive:true});
  window.addEventListener("resize",schedule,{passive:true});
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)afterNavigation();});
  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area==="local"&&changes.enabled)schedule();
  });
})();
