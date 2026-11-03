/* PetrifyUI 1.12: approved-art pixel scroll, native composer controls. */
(() => {
  "use strict";
  const root=document.documentElement;
  const EDITOR='#prompt-textarea,[data-testid="prompt-textarea"],[contenteditable="true"][role="textbox"],textarea[placeholder]';
  const ACTION='button[data-testid="send-button"],button[data-testid="composer-submit-button"],button[data-testid="composer-speech-button"],button[aria-label*="send" i],button[aria-label*="voice" i],button[aria-label*="microphone" i],button[aria-label*="dictate" i]';
  const files={
    "--pui-scroll-left":"roller-left.png",
    "--pui-scroll-right":"roller-right.png",
    "--pui-scroll-top":"top-edge.png",
    "--pui-scroll-bottom":"bottom-edge.png",
    "--pui-scroll-fill":"paper-tile.png"
  };
  for(const [property,file] of Object.entries(files))root.style.setProperty(property,
    'url("'+chrome.runtime.getURL("assets/composer/v2/"+file)+'")');
  let selected=null,mode=null,toolbar=null,scheduled=false;
  function removeTags(){
    selected?.removeAttribute("data-petrifyui-composer");
    mode?.removeAttribute("data-petrifyui-mode-button");
    toolbar?.removeAttribute("data-petrifyui-toolbar");
    selected=mode=toolbar=null;
  }
  function isVisible(el){
    if(!(el instanceof HTMLElement))return false;
    const r=el.getBoundingClientRect();
    return r.width>50&&r.height>10&&r.right>0&&r.bottom>0&&r.top<innerHeight;
  }
  function editor(){
    for(const el of document.querySelectorAll(EDITOR)){
      if(!isVisible(el) || el.closest('[role="dialog"],[role="menu"],[role="listbox"]'))continue;
      if(el.getBoundingClientRect().bottom>innerHeight*.38)return el;
    }
    return null;
  }
  function findSurface(el){
    const known=el.closest('[data-testid="composer-root"],form[data-type="unified-composer"],#composer-background');
    if(isVisible(known)&&known.querySelector("button,[role=button]"))return known;
    const inputBox=el.getBoundingClientRect();
    let best=null,score=-Infinity;
    for(let n=el.parentElement,depth=0;n&&n!==document.body&&depth<10;n=n.parentElement,depth++){
      if(!isVisible(n))continue;
      const r=n.getBoundingClientRect();
      if(r.width<inputBox.width*.82||r.height>Math.min(innerHeight*.78,680))continue;
      const buttons=n.querySelectorAll("button,[role=button]").length;
      if(!buttons)continue;
      const radius=parseFloat(getComputedStyle(n).borderTopLeftRadius)||0;
      const s=(radius>=12?45:0)+Math.min(buttons,7)*6-depth*3-
        Math.abs(r.width-inputBox.width)*.022-Math.max(0,r.height-200)*.25;
      if(s>score){score=s;best=n;}
    }
    return best;
  }
  function findMode(panel){
    for(const button of panel.querySelectorAll("button,[role=button]")){
      const label=(button.textContent||"").trim().replace(/\s+/g," ");
      const aria=(button.getAttribute("aria-label")||"").toLowerCase();
      if(/^(instant|medium|high|extra high|thinking|auto)$/i.test(label)||
        /thinking effort|select model/.test(aria))return button;
    }
    return null;
  }
  function findToolbar(button,panel){
    if(!button)return null;
    const outer=panel.getBoundingClientRect();
    for(let n=button.parentElement,depth=0;n&&n!==panel&&depth<5;n=n.parentElement,depth++){
      if(!(n instanceof HTMLElement)||n.querySelector("img,video"))continue;
      const r=n.getBoundingClientRect();
      if(r.height>=24&&r.height<=96&&r.width>=outer.width*.35&&r.bottom>=outer.bottom-36)
        return n;
    }
    return null;
  }
  function apply(){
    scheduled=false;
    if(document.hidden||!root.hasAttribute("data-petrifyui-active")){removeTags();return;}
    const input=editor();
    const next=input?findSurface(input):null;
    if(!next){removeTags();return;}
    const nextMode=findMode(next);
    const nextToolbar=findToolbar(nextMode,next);
    if(selected!==next){selected?.removeAttribute("data-petrifyui-composer");selected=next;}
    if(mode!==nextMode){mode?.removeAttribute("data-petrifyui-mode-button");mode=nextMode;}
    if(toolbar!==nextToolbar){toolbar?.removeAttribute("data-petrifyui-toolbar");toolbar=nextToolbar;}
    selected?.setAttribute("data-petrifyui-composer","");
    mode?.setAttribute("data-petrifyui-mode-button","");
    toolbar?.setAttribute("data-petrifyui-toolbar","");
  }
  function queue(){if(scheduled||document.hidden)return;scheduled=true;requestAnimationFrame(apply);}
  function kick(){queue();setTimeout(queue,220);setTimeout(queue,750);}
  if(document.readyState==="loading")
    document.addEventListener("DOMContentLoaded",kick,{once:true});
  else kick();
  document.addEventListener("focusin",queue,{passive:true});
  document.addEventListener("input",e=>{if(e.target instanceof Element&&e.target.matches(EDITOR))queue();},{passive:true});
  document.addEventListener("pointerdown",queue,{passive:true});
  document.addEventListener("change",queue,{passive:true});
  document.addEventListener("drop",kick,{passive:true});
  document.addEventListener("paste",kick,{passive:true});
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)kick();});
  window.addEventListener("resize",queue,{passive:true});
  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area==="local"&&changes.enabled)queue();
  });
})();