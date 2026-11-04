/* PetrifyUI experimental stage v1.29: presentation-only architecture.
   Keep ChatGPT's native flex, grid, scroll and composer geometry intact. */
(() => {
  "use strict";
  const html=document.documentElement;
  if(html.hasAttribute("data-pui-stage-script"))return;
  html.setAttribute("data-pui-stage-script","");

  const SIDEBAR=[
    "#sidebar","#stage-slideover-sidebar",
    '[data-testid="sidebar"]','[data-testid="sidebar-container"]',
    '[data-testid="sidebar-mini"]','[data-testid="sidebar-collapsed"]',
    '[data-testid="collapsed-sidebar"]','nav[aria-label="Chat history"]'
  ].join(",");
  const EDITOR=[
    "#prompt-textarea",'[data-testid="prompt-textarea"]',
    '[contenteditable="true"][role="textbox"]'
  ].join(",");
  const MESSAGE=[
    '#thread','[data-testid^="conversation-turn"]',
    '[data-message-author-role]'
  ].join(",");
  const NATIVE_MAIN='main,[role="main"],#main';
  const SHELL_ATTRS={
    scene:"data-pui-scene-shell",
    flow:"data-pui-flow-shell",
    sidebar:"data-pui-sidebar-shell"
  };
  const tracked={
    scene:new Set(),flow:new Set(),sidebar:new Set()
  };
  let activeStage=null,activeSidebar=null,activeHeader=null,activeComposer=null;
  let queued=false,appObserver=null,sidebarObserver=null,headerObserver=null;
  const waiters=new Set();

  html.style.setProperty("--pui-ambient-art",
    'url("'+chrome.runtime.getURL("assets/stage/ocean-pixel.png")+'")');
  html.style.setProperty("--pui-stage-paper",
    'url("'+chrome.runtime.getURL("assets/composer/paper-grain-geekify.svg")+'")');

  function chatRoute(){
    return /^\/(?:$|c\/|g\/|project\/|projects\/)/.test(location.pathname);
  }
  function box(node){
    if(!(node instanceof HTMLElement)||!node.isConnected)return null;
    const r=node.getBoundingClientRect();
    if(r.width<4||r.height<4||r.right<=0||r.bottom<=0||
       r.left>=innerWidth||r.top>=innerHeight)return null;
    const style=getComputedStyle(node);
    if(style.display==="none"||style.visibility==="hidden")return null;
    return r;
  }
  function firstVisible(query){
    for(const el of document.querySelectorAll(query)){
      if(box(el))return el;
    }
    return null;
  }
  function findSidebar(){
    const options=[...document.querySelectorAll(SIDEBAR)].filter(el=>{
      const r=box(el);
      return r&&r.left<=30&&r.width<=Math.min(520,innerWidth*.48)&&
        r.height>=innerHeight*.37;
    });
    if(!options.length)return null;
    // Pick the broadest sidebar shell, then optionally climb to its
    // width-matched dock so the header and scroll region share ONE frame.
    let selected=options.find(el=>
      !options.some(other=>other!==el&&other.contains(el))
    )||options[0];
    const initial=box(selected);
    for(let parent=selected.parentElement,depth=0;
        parent&&parent!==document.body&&depth<6;
        parent=parent.parentElement,depth++){
      const r=box(parent);
      if(!r||r.width>Math.max(initial.width+36,540)||r.left>32||
         r.height<initial.height-36||
         parent.querySelector(EDITOR))break;
      selected=parent;
    }
    return selected;
  }
  function findMain(sidebar){
    if(!chatRoute())return null;
    const editor=firstVisible(EDITOR);
    const message=firstVisible(MESSAGE);
    const seed=editor||message;
    if(!seed)return null;
    const sr=box(sidebar);
    // Native <main> is preferred, but only if it does not contain the sidebar.
    const minSceneWidth=Math.min(700,Math.max(360,
      (innerWidth-(sr?.right||0))*.63));
    for(const candidate of [editor?.closest(NATIVE_MAIN),message?.closest(NATIVE_MAIN)]){
      const r=box(candidate);
      if(!r||candidate.contains(sidebar))continue;
      // On New Chat, <main> may be only the narrow centered welcome
      // column. Its parent is the real scene that should receive paper.
      if(r.width>=minSceneWidth)return candidate;
    }
    let best=null,bestScore=-Infinity;
    for(let node=seed.parentElement,depth=0;
        node&&node!==document.body&&depth<21;
        node=node.parentElement,depth++){
      const r=box(node);
      if(!r||node.contains(sidebar)||r.height<innerHeight*.40||
         r.width<Math.min(420,innerWidth*.54))continue;
      if(sr&&r.right<sr.right+300)continue;
      // Prefer the largest, near-viewport app region. The selected node
      // is tagged for color/background only, NEVER resized.
      const score=(r.height/innerHeight)*38+
        (r.width/innerWidth)*23+
        (r.top<=80?18:0)+(r.bottom>=innerHeight-72?16:0)+
        depth*.55;
      if(score>bestScore){best=node;bestScore=score;}
    }
    return best;
  }
  function findComposerTray(){
    // Independently identify the composer across native ChatGPT variants.
    // This is only a PAINT tag and never adjusts dimensions or position.
    const input=firstVisible(EDITOR);
    if(!input)return null;
    const known=input.closest(
      '#composer-background,[data-testid="composer-background"],'+
      '[data-testid="composer-root"],form[data-type="unified-composer"]'
    );
    if(known instanceof HTMLElement&&box(known))return known;
    let candidate=null;
    for(let n=input.parentElement,depth=0;
        n&&n!==document.body&&depth<12;n=n.parentElement,depth++){
      const r=box(n);
      if(!r||r.height>innerHeight*.64||r.width>innerWidth*.90)break;
      const controls=n.querySelector(
        '[data-composer-trailing-controls="true"],'+
        'button[aria-label="Stop"],button[aria-label*="send" i],'+
        'button[aria-label*="voice" i],button[data-testid="composer-submit-button"]'
      );
      if(!controls)continue;
      candidate=n;
      if(n.matches('form,[class*="composer"],[class*="rounded"]'))break;
    }
    return candidate;
  }
  function findHeader(sidebar){
    const nodes=[];
    const tagged=document.querySelector('[data-petrifyui-topbar]');
    if(tagged)nodes.push(tagged);
    const point=document.elementFromPoint(20,25);
    for(let el=point,depth=0;el&&depth<8;el=el.parentElement,depth++){
      if(el instanceof HTMLElement)nodes.push(el);
    }
    // Catch headers that React replaces independently of the nav.
    for(const el of document.querySelectorAll(
      'header,[data-testid*="sidebar-header"],[data-testid="sidebar-header"]'
    ))nodes.push(el);
    let best=null,bestScore=-Infinity;
    for(const el of new Set(nodes)){
      const r=box(el);
      if(!r||r.left>40||r.top>42||r.width<175||r.width>470||
         r.height<32||r.height>110)continue;
      const buttons=el.querySelectorAll('button,[role="button"]').length;
      if(buttons<1)continue;
      const score=(el===tagged?40:0)+(sidebar?.contains(el)?25:0)+
        Math.min(buttons,5)*5+Math.max(0,90-r.height)*.15;
      if(score>bestScore){best=el;bestScore=score;}
    }
    return best;
  }
  function replaceMarks(set,next,attr){
    for(const el of set)if(!next.has(el)&&el.isConnected)
      el.removeAttribute(attr);
    set.clear();
    for(const el of next){
      if(!el.hasAttribute(attr))el.setAttribute(attr,"");
      set.add(el);
    }
  }
  function markScene(stage){
    const nodes=new Set();
    for(let el=stage?.parentElement,depth=0;
        el&&el!==document.body&&depth<18;
        el=el.parentElement,depth++) {
      if(el instanceof HTMLElement)nodes.add(el);
    }
    replaceMarks(tracked.scene,nodes,SHELL_ATTRS.scene);
  }
  function markFlow(stage){
    const nodes=new Set();
    if(stage){
      const sources=[stage.querySelector(EDITOR),stage.querySelector(MESSAGE)];
      for(const seed of sources){
        let n=seed?.parentElement;
        for(let depth=0;n&&n!==stage&&depth<16;n=n.parentElement,depth++){
          const composerShell=[
            '[data-petrifyui-composer]','#composer-background',
            '[data-testid="composer-root"]',
            '[data-testid="composer-background"]',
            'form[data-type="unified-composer"]'
          ].join(',');
          if(!(n instanceof HTMLElement)||n.matches(
            '[role="dialog"],[role="menu"],pre,code'
          )||n.matches(composerShell)||n.closest(composerShell))continue;
          const r=box(n);
          // Wide structural scroll/footer shells can paint the black bands,
          // but small cards, attachments and tool blocks must remain intact.
          if(r&&r.width>=Math.min(420,innerWidth*.35)&&r.height>=35)
            nodes.add(n);
        }
      }
    }
    replaceMarks(tracked.flow,nodes,SHELL_ATTRS.flow);
  }
  function markSidebarLayers(sidebar){
    const nodes=new Set();
    if(sidebar){
      nodes.add(sidebar);
      const root=box(sidebar);
      for(const el of sidebar.querySelectorAll(SIDEBAR)){
        const r=box(el);
        if(root&&r&&r.width>=root.width*.65&&r.height>=48)
          nodes.add(el);
      }
    }
    replaceMarks(tracked.sidebar,nodes,SHELL_ATTRS.sidebar);
  }
  function positionPaper(stage,sidebar){
    const r=box(stage),s=box(sidebar);
    if(!r)return;
    const contentLeft=Math.max(r.left,s?.right||0,0);
    const contentRight=Math.min(innerWidth,r.right);
    const available=Math.max(300,contentRight-contentLeft);
    const width=Math.max(300,Math.min(1040,available-32));
    const left=Math.max(8,Math.min(
      contentLeft+(available-width)/2,innerWidth-width-8
    ));
    html.style.setProperty("--pui-panel-left",Math.round(left)+"px");
    html.style.setProperty("--pui-panel-width",Math.round(width)+"px");
  }
  function observeParent(previous,node,callback){
    previous?.disconnect();
    const parent=node?.parentElement;
    if(!parent)return null;
    const observer=new MutationObserver(callback);
    observer.observe(parent,{childList:true});
    return observer;
  }
  function update(){
    queued=false;
    if(document.hidden)return;
    const side=findSidebar();
    const stage=findMain(side);
    const header=findHeader(side);
    const composer=findComposerTray();

    if(activeStage!==stage)activeStage?.removeAttribute("data-pui-main-stage");
    if(activeSidebar!==side){
      activeSidebar?.removeAttribute("data-pui-floating-sidebar");
      sidebarObserver=observeParent(sidebarObserver,side,schedule);
    }
    if(activeHeader!==header){
      activeHeader?.removeAttribute("data-pui-stage-header");
      activeHeader?.removeAttribute("data-pui-header-detached");
      headerObserver=observeParent(headerObserver,header,schedule);
    }
    if(activeComposer!==composer)
      activeComposer?.removeAttribute("data-pui-stage-composer");
    activeStage=stage;activeSidebar=side;activeHeader=header;
    activeComposer=composer;
    composer?.setAttribute("data-pui-stage-composer","");
    stage?.setAttribute("data-pui-main-stage","");
    side?.setAttribute("data-pui-floating-sidebar","");
    if(header){
      header.setAttribute("data-pui-stage-header","");
      header.toggleAttribute("data-pui-header-detached",
        !(side?.contains(header)));
    }
    markScene(stage);
    markFlow(stage);
    markSidebarLayers(side);
    if(stage)positionPaper(stage,side);
    html.toggleAttribute("data-pui-stage-ready",!!stage);
    html.setAttribute("data-pui-stage-status",
      stage?"ready":"no-chat-stage");
    html.toggleAttribute("data-pui-new-chat",
      chatRoute()&&!firstVisible('[data-message-author-role]'));
    html.dataset.puiStageRevision="architecture-v129";
  }
  function schedule(){
    if(queued||document.hidden)return;
    queued=true;
    requestAnimationFrame(update);
  }
  function resync(){
    schedule();
    for(const ms of [220,750,1700])setTimeout(schedule,ms);
  }
  function observeApp(){
    if(appObserver||!document.body)return;
    const host=document.querySelector('#__next,#root,[data-testid="chatgpt-app"]')||
      document.body;
    appObserver=new MutationObserver(records=>{
      if(records.some(record=>
        [...record.addedNodes,...record.removedNodes].some(n=>n.nodeType===1)
      ))schedule();
    });
    // Shallow: do not watch streaming content or every text change.
    appObserver.observe(host,{childList:true});
  }
  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",()=>{
      observeApp();resync();
    },{once:true});
  } else {observeApp();resync();}
  document.addEventListener("click",event=>{
    if(event.target instanceof Element&&event.target.closest(
      'a[href],button[aria-label*="sidebar" i],'+
      'button[title*="sidebar" i],'+
      '[data-testid="create-new-chat-button"]'
    ))resync();
  },{passive:true});
  window.addEventListener("popstate",resync,{passive:true});
  window.addEventListener("pageshow",resync,{passive:true});
  window.addEventListener("resize",schedule,{passive:true});
  document.addEventListener("visibilitychange",()=>{
    if(!document.hidden)resync();
  });
  document.addEventListener("focusin",event=>{
    if(event.target instanceof Element&&event.target.closest(EDITOR))
      schedule();
  },{passive:true});
  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area==="local"&&changes.enabled)schedule();
  });
})();
