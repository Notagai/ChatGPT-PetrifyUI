/* PetrifyUI 1.14: fixed-surface paper composer, tattered pixel edges.
   Keep ChatGPT in charge of all geometry, attachments and button actions. */
(() => {
  "use strict";
  const root=document.documentElement;
  const EDITOR='#prompt-textarea,[data-testid="prompt-textarea"],[contenteditable="true"][role="textbox"],textarea[placeholder]';
  const ACTION='button[data-testid="send-button"],button[data-testid="composer-submit-button"],button[aria-label*="send" i],button[aria-label*="voice" i],button[data-testid="composer-speech-button"]';
  for(const [variable,file] of [
    ["--pui-paper-composer","paper-grain-geekify.svg"],
    ["--pui-torn-paper-top","paper-torn-top.svg"],
    ["--pui-torn-paper-bottom","paper-torn-bottom.svg"]
  ]) {
    root.style.setProperty(variable,'url("'+chrome.runtime.getURL("assets/composer/"+file)+'")');
  }

  let activePanel=null,activeMode=null,pending=false;
  const activeShells=new Set();
  const darkBars=new Set();
  function rect(el){
    if(!(el instanceof HTMLElement))return null;
    const r=el.getBoundingClientRect();
    if(r.width<30||r.height<9||r.bottom<=0||r.top>=innerHeight||
       r.right<=0||r.left>=innerWidth)return null;
    return r;
  }
  function editor(){
    for(const el of document.querySelectorAll(EDITOR)){
      const r=rect(el);
      if(!r||r.bottom<innerHeight*.36||
        el.closest('[role="dialog"],[role="menu"],[role="listbox"]'))continue;
      return el;
    }
    return null;
  }
  function panelFor(el){
    // Keep the same panel while ChatGPT grows it for long messages. Choosing
    // by current height on each keystroke caused the flicker/deformation.
    if(activePanel?.isConnected&&activePanel.contains(el))return activePanel;
    const known=el.closest('#composer-background,[data-testid="composer-root"],[data-testid="composer-background"],form[data-type="unified-composer"]');
    if(rect(known)&&known.querySelector('button,[role="button"]'))return known;
    const er=rect(el);
    if(!er)return null;
    let best=null,score=-Infinity;
    for(let p=el.parentElement,d=0;p&&p!==document.body&&d<10;p=p.parentElement,d++){
      const r=rect(p);if(!r||r.width<er.width*.80||r.height>innerHeight*.78)continue;
      const count=p.querySelectorAll("button,[role='button']").length;
      if(!count)continue;
      const send=!!p.querySelector(ACTION);
      const round=parseFloat(getComputedStyle(p).borderTopLeftRadius)||0;
      // Score is based on structure, not height, width changes or text length.
      const value=(send?75:0)+(round>=10?25:0)+Math.min(count,5)*3-d*5;
      if(value>score){score=value;best=p;}
    }
    return best;
  }
  function modeFor(panel){
    for(const button of panel.querySelectorAll("button,[role='button']")){
      const label=(button.textContent||"").trim().replace(/\s+/g," ");
      const aria=(button.getAttribute("aria-label")||"").toLowerCase();
      if(/^(instant|medium|high|extra high|thinking|auto)$/i.test(label)||
         /thinking effort|select model/.test(aria))return button;
    }
    return null;
  }
  function backgroundDark(el){
    const css=getComputedStyle(el);
    const match=/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?/.exec(css.backgroundColor);
    if(match){
      const alpha=match[4]===undefined?1:Number(match[4]);
      if(alpha>.65&&Math.max(Number(match[1]),Number(match[2]),Number(match[3]))<85)return true;
    }
    return /(?:bg-black|bg-zinc-[6789]|bg-neutral-[6789]|bg-token-main-surface)/.test(String(el.className));
  }
  function reconcile(current,next,attribute){
    for(const node of current)if(!next.has(node))node.removeAttribute(attribute);
    for(const node of next)if(!node.hasAttribute(attribute))node.setAttribute(attribute,"");
    current.clear();for(const node of next)current.add(node);
  }
  function markShells(input,panel){
    const next=new Set();
    for(let n=input.parentElement,d=0;n&&n!==panel&&d<8;n=n.parentElement,d++){
      if(!(n instanceof HTMLElement)||n.querySelector('img,video,canvas'))continue;
      if(n.matches('[class*="bg-token-"],[class*="bg-black"],[class*="bg-zinc"],[class*="bg-neutral"]')||backgroundDark(n))
        next.add(n);
    }
    reconcile(activeShells,next,"data-pui-paper-inner");
  }
  function markToolbar(panel){
    const r=rect(panel);
    if(!r)return;
    const next=new Set();
    // Examine the composer's own descendants, never the entire ChatGPT page.
    // Catch unnamed dark divs as well as token-colored bars; don't modify
    // attachment preview cards or the actual interactive controls.
    let scanned=0;
    for(const node of panel.querySelectorAll("div,section,footer,nav,form")){
      if(++scanned>160)break;
      if(!(node instanceof HTMLElement)||node===panel||
         node.querySelector('img,video,canvas'))continue;
      const b=rect(node);if(!b)continue;
      if(b.width<Math.min(110,r.width*.26)||b.width>r.width+8||
         b.height<20||b.height>90||b.bottom<r.bottom-45||b.top>r.bottom)continue;
      if(!node.querySelector("button,[role='button']"))continue;
      if(backgroundDark(node))next.add(node);
    }
    reconcile(darkBars,next,"data-pui-paper-toolbar");
  }
  function clear(){
    activePanel?.removeAttribute("data-petrifyui-composer");
    activeMode?.removeAttribute("data-petrifyui-mode-button");
    reconcile(activeShells,new Set(),"data-pui-paper-inner");
    reconcile(darkBars,new Set(),"data-pui-paper-toolbar");
    activePanel=activeMode=null;
  }
  function update(){
    pending=false;
    if(document.hidden||!root.hasAttribute("data-petrifyui-active")){clear();return;}
    const input=editor();
    const panel=input?panelFor(input):null;
    if(!panel){clear();return;}
    const mode=modeFor(panel);
    if(panel!==activePanel){
      activePanel?.removeAttribute("data-petrifyui-composer");
      activePanel=panel;
    }
    if(mode!==activeMode){
      activeMode?.removeAttribute("data-petrifyui-mode-button");
      activeMode=mode;
    }
    panel.setAttribute("data-petrifyui-composer","");
    mode?.setAttribute("data-petrifyui-mode-button","");
    markShells(input,panel);
    markToolbar(panel);
  }
  function schedule(){
    if(pending||document.hidden)return;
    pending=true;
    requestAnimationFrame(update);
  }
  function startup(){schedule();setTimeout(schedule,220);setTimeout(schedule,760);}
  if(document.readyState==="loading")
    document.addEventListener("DOMContentLoaded",startup,{once:true});
  else startup();
  document.addEventListener("focusin",schedule,{passive:true});
  document.addEventListener("pointerdown",schedule,{passive:true});
  document.addEventListener("change",schedule,{passive:true});
  document.addEventListener("input",e=>{
    // Native layout expands automatically; only rescan when an editor was replaced.
    if(e.target instanceof Element&&e.target.matches(EDITOR)&&
       (!activePanel||!activePanel.contains(e.target)))schedule();
  },{passive:true});
  document.addEventListener("paste",startup,{passive:true});
  document.addEventListener("drop",startup,{passive:true});
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)schedule();});
  window.addEventListener("resize",schedule,{passive:true});
  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area==="local"&&changes.enabled)schedule();
  });
})();