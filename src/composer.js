/* PetrifyUI 1.13: stable pixel-paper composer, keeping ChatGPT's native UI. */
(() => {
  "use strict";
  const root=document.documentElement;
  const EDITOR='#prompt-textarea,[data-testid="prompt-textarea"],[contenteditable="true"][role="textbox"],textarea[placeholder]';
  const SEND='button[data-testid="send-button"],button[data-testid="composer-submit-button"],button[aria-label*="send" i],button[aria-label*="voice" i],button[data-testid="composer-speech-button"]';
  const paperURL=chrome.runtime.getURL("assets/composer/paper-grain-geekify.svg");
  root.style.setProperty("--pui-paper-composer",'url("'+paperURL+'")');
  let activePanel=null,activeMode=null,marked=new Set(),queued=false;

  function visible(node){
    if(!(node instanceof HTMLElement))return false;
    const b=node.getBoundingClientRect();
    return b.width>35&&b.height>10&&b.right>0&&b.bottom>0&&
      b.left<innerWidth&&b.top<innerHeight;
  }
  function findEditor(){
    for(const candidate of document.querySelectorAll(EDITOR)){
      if(!visible(candidate))continue;
      if(candidate.closest('[role="dialog"],[role="menu"],[role="listbox"]'))continue;
      if(candidate.getBoundingClientRect().bottom>innerHeight*.36)return candidate;
    }
    return null;
  }
  function findPanel(editor){
    // First use stable composer IDs, not text/attachment-preview containers.
    const native=editor.closest('#composer-background,[data-testid="composer-root"],[data-testid="composer-background"],form[data-type="unified-composer"]');
    if(native&&visible(native)&&native.querySelector('button,[role="button"]'))return native;
    const er=editor.getBoundingClientRect();
    let best=null,score=-Infinity;
    for(let el=editor.parentElement,depth=0;el&&depth<9&&el!==document.body;el=el.parentElement,depth++){
      if(!visible(el))continue;
      const r=el.getBoundingClientRect();
      if(r.width<er.width*.82 || r.height>Math.min(innerHeight*.7,600))continue;
      const buttons=el.querySelectorAll('button,[role="button"]');
      if(!buttons.length)continue;
      const radius=parseFloat(getComputedStyle(el).borderTopLeftRadius)||0;
      const containsSend=!!el.querySelector(SEND);
      // Prefer a compact, painted surface containing both editor and controls;
      // penalize outer layouts containing attachment galleries or entire pages.
      const s=(containsSend?55:0)+(radius>=10?28:0)+Math.min(buttons.length,5)*3-
        depth*3-Math.max(0,r.height-180)*.25-Math.abs(r.width-er.width)*.015;
      if(s>score){score=s;best=el;}
    }
    return best;
  }
  function findMode(panel){
    for(const button of panel.querySelectorAll('button,[role="button"]')){
      const label=(button.textContent||"").trim().replace(/\s+/g," ");
      const aria=(button.getAttribute("aria-label")||"").toLowerCase();
      if(/^(instant|medium|high|extra high|thinking|auto)$/i.test(label)||
        /thinking effort|select model/.test(aria))return button;
    }
    return null;
  }
  function markInnerPaper(editor,panel){
    // Clear dark editor-shell panels only. Attachment cards, preview images,
    // dropdowns and buttons keep their own backgrounds and spacing.
    let n=editor.parentElement,depth=0;
    while(n&&n!==panel&&depth++<7){
      if(n instanceof HTMLElement&&
         !n.querySelector('img,video,canvas')&&
         n.matches('[class*="bg-token-"],[class*="bg-black"],[class*="bg-neutral"],[class*="bg-zinc"]')){
        n.setAttribute("data-pui-paper-inner","");
        marked.add(n);
      }
      n=n.parentElement;
    }
  }
  function clear(){
    activePanel?.removeAttribute("data-petrifyui-composer");
    activeMode?.removeAttribute("data-petrifyui-mode-button");
    for(const el of marked)el.removeAttribute("data-pui-paper-inner");
    marked.clear();
    activePanel=activeMode=null;
  }
  function render(){
    queued=false;
    if(document.hidden || !root.hasAttribute("data-petrifyui-active")){clear();return;}
    const editor=findEditor();
    const panel=editor?findPanel(editor):null;
    if(!panel){clear();return;}
    const mode=findMode(panel);
    if(activePanel!==panel||activeMode!==mode)clear();
    activePanel=panel;
    activeMode=mode;
    if(!panel.hasAttribute("data-petrifyui-composer"))panel.setAttribute("data-petrifyui-composer","");
    if(mode&&!mode.hasAttribute("data-petrifyui-mode-button"))mode.setAttribute("data-petrifyui-mode-button","");
    markInnerPaper(editor,panel);
  }
  function schedule(){
    if(queued||document.hidden)return;
    queued=true;
    requestAnimationFrame(render);
  }
  function startup(){schedule();setTimeout(schedule,250);setTimeout(schedule,850);}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",startup,{once:true});
  else startup();
  document.addEventListener("focusin",schedule,{passive:true});
  document.addEventListener("pointerdown",schedule,{passive:true});
  document.addEventListener("change",schedule,{passive:true});
  document.addEventListener("input",e=>{if(e.target instanceof Element&&e.target.matches(EDITOR))schedule();},{passive:true});
  document.addEventListener("paste",startup,{passive:true});
  document.addEventListener("drop",startup,{passive:true});
  window.addEventListener("resize",schedule,{passive:true});
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)schedule();});
  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area==="local"&&changes.enabled)schedule();
  });
})();