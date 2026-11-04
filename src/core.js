/* PetrifyUI Core v2: one adapter, one scheduler, no continuous content polling.
   Modules receive measured DOM anchors; CSS remains responsible for paint. */
(() => {
  "use strict";
  if (globalThis.PetrifyCore) return;
  const root=document.documentElement;
  const editorSelector='#prompt-textarea,[data-testid="prompt-textarea"],[contenteditable="true"][role="textbox"]';
  const actions='button[data-testid="send-button"],button[data-testid="composer-submit-button"],button[aria-label*="send" i],button[aria-label="Stop" i],[data-composer-trailing-controls="true"]';
  const modules=new Map();
  let queued=false,frame=0,lastEditor=null,lastComposer=null,lastMode=null;
  let observer=null,observedHost=null,composerObserver=null,composerObservedParent=null;
  const stats={runs:0,workMs:0,lastMs:0,observerEvents:0};

  for(const [key,path] of [
    ["--pui-paper-composer","assets/composer/paper-grain-geekify.svg"],
    ["--pui-torn-paper-top","assets/composer/paper-torn-top.svg"],
    ["--pui-torn-paper-bottom","assets/composer/paper-torn-bottom.svg"]
  ]) root.style.setProperty(key,'url("'+chrome.runtime.getURL(path)+'")');

  function visible(el){
    if(!(el instanceof HTMLElement)||!el.isConnected)return null;
    const r=el.getBoundingClientRect();
    if(r.width<25||r.height<8||r.bottom<=0||r.top>=innerHeight||
       r.left>=innerWidth||r.right<=0)return null;
    const style=getComputedStyle(el);
    return style.display==="none"||style.visibility==="hidden"?null:r;
  }
  function findEditor(){
    if(lastEditor&&visible(lastEditor)&&!lastEditor.closest('[role="dialog"],[role="menu"]'))
      return lastEditor;
    for(const el of document.querySelectorAll(editorSelector)){
      const r=visible(el);
      if(r&&r.bottom>innerHeight*.30&&!el.closest('[role="dialog"],[role="menu"],[role="listbox"]'))
        return el;
    }
    return null;
  }
  function findComposer(input){
    if(!input)return null;
    if(lastComposer?.contains(input)&&visible(lastComposer))return lastComposer;
    const exact=input.closest('#composer-background,[data-testid="composer-root"],[data-testid="composer-background"],form[data-type="unified-composer"]');
    if(visible(exact)&&exact.querySelector(actions))return exact;
    const ir=visible(input);
    let best=null,bestScore=-Infinity;
    for(let node=input.parentElement,depth=0;node&&node!==document.body&&depth<11;node=node.parentElement,depth++){
      const r=visible(node);
      if(!r||!ir||r.width<ir.width*.8||r.width>innerWidth*.9||r.height>innerHeight*.64)continue;
      if(!node.querySelector(actions))continue;
      const score=(node.matches("form")?50:0)+(node.matches('[class*="composer"],[class*="rounded"]')?18:0)+
        (node.querySelector('[data-composer-trailing-controls="true"]')?25:0)-depth*3;
      if(score>bestScore){best=node;bestScore=score;}
    }
    return best;
  }
  function observeComposerParent(composer){
    const parent=composer?.parentElement||null;
    if(parent===composerObservedParent)return;
    composerObserver?.disconnect();
    composerObservedParent=parent;
    if(!parent)return;
    composerObserver=new MutationObserver(records=>{
      if(records.some(r=>r.addedNodes.length||r.removedNodes.length)){
        stats.observerEvents++;schedule();
      }
    });
    composerObserver.observe(parent,{childList:true});
  }
  function setMarker(previous,next,attribute){
    if(previous!==next){
      previous?.removeAttribute(attribute);
      next?.setAttribute(attribute,"");
    }
  }
  function updateComposer(){
    const editor=findEditor(),composer=findComposer(editor);
    setMarker(lastComposer,composer,"data-petrifyui-composer");
    setMarker(lastComposer,composer,"data-pui-stage-composer");
    lastEditor=editor;lastComposer=composer;
    observeComposerParent(composer);
    // Native mode selector may be replaced during an effort change.
    let mode=null;
    if(composer){
      for(const button of composer.querySelectorAll('button,[role="button"]')){
        const label=(button.textContent||"").trim().replace(/\s+/g," ");
        if(/^(instant|medium|high|extra high|thinking|auto)$/i.test(label)){mode=button;break;}
      }
    }
    setMarker(lastMode,mode,"data-petrifyui-mode-button");
    lastMode=mode;
    return {editor,composer};
  }
  function flush(){
    queued=false;frame=0;
    if(document.hidden)return;
    const start=performance.now();
    const anchors=root.hasAttribute("data-petrifyui-active")?updateComposer():{editor:null,composer:null};
    if(!root.hasAttribute("data-petrifyui-active")){
      setMarker(lastComposer,null,"data-petrifyui-composer");
      setMarker(lastComposer,null,"data-pui-stage-composer");
      setMarker(lastMode,null,"data-petrifyui-mode-button");
      lastComposer=lastEditor=lastMode=null;
      observeComposerParent(null);
    }
    for(const [name,callback] of modules){
      try{callback(anchors);}catch(error){console.warn("[PetrifyUI] module",name,error);}
    }
    stats.runs++;stats.lastMs=Math.round((performance.now()-start)*100)/100;
    stats.workMs+=stats.lastMs;
  }
  function schedule(){
    if(queued||document.hidden)return;
    queued=true;frame=requestAnimationFrame(flush);
  }
  function observeHost(){
    if(observer||!document.body)return;
    const host=document.querySelector('#__next,#root,[data-testid="chatgpt-app"]')||document.body;
    observedHost=host;
    observer=new MutationObserver(records=>{
      // Only structural changes at the app root; never scan streaming text.
      if(records.some(r=>r.addedNodes.length||r.removedNodes.length)){
        stats.observerEvents++;schedule();
      }
    });
    observer.observe(host,{childList:true});
  }
  function startup(){
    observeHost();schedule();
    // A small bounded startup retry handles hydration and SPA restoration.
    setTimeout(schedule,250);setTimeout(schedule,900);
  }
  const api=Object.freeze({
    register(name,callback){
      if(typeof name!=="string"||typeof callback!=="function")throw TypeError("Invalid module");
      modules.set(name,callback);schedule();
      return ()=>modules.delete(name);
    },
    schedule,
    getAnchors:()=>({editor:lastEditor,composer:lastComposer}),
    getStats:()=>({...stats,moduleCount:modules.size,hasObserver:!!observer,hasComposerObserver:!!composerObserver&&!!composerObservedParent})
  });
  globalThis.PetrifyCore=api;
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",startup,{once:true});
  else startup();
  document.addEventListener("click",event=>{
    if(!(event.target instanceof Element))return;
    const control=event.target.closest('a[href],button,[role="button"]');
    if(!control)return;
    schedule();
    // SPA sidebar animations and Settings transitions replace containers
    // after the click handler. Two bounded resamples, not continuous polling.
    if(control.matches('[aria-label*="sidebar" i],[title*="sidebar" i]')||
       control.closest('[aria-label*="sidebar" i],[title*="sidebar" i]')||
       /settings|back to app|profile/i.test(control.textContent||"")){
      setTimeout(schedule,140);
      setTimeout(schedule,420);
    }
  },{passive:true});
  document.addEventListener("focusin",event=>{
    if(event.target instanceof Element&&event.target.matches(editorSelector))schedule();
  },{passive:true});
  window.addEventListener("resize",schedule,{passive:true});
  window.addEventListener("popstate",schedule,{passive:true});
  window.addEventListener("pageshow",schedule,{passive:true});
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)schedule();});
  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area==="local"&&changes.enabled)schedule();
  });
})();