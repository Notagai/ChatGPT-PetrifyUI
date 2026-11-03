/* PetrifyUI 1.9.1: locate ChatGPT's real composer through the editor.
   No full-page MutationObserver, timers polling forever, or layout changes. */
(() => {
  "use strict";
  const EDITOR = '#prompt-textarea,[data-testid="prompt-textarea"],[contenteditable="true"][role="textbox"],textarea[placeholder]';
  const ACTION = [
    'button[data-testid="send-button"]',
    'button[data-testid="composer-submit-button"]',
    'button[data-testid="composer-speech-button"]',
    'button[aria-label*="send" i]',
    'button[aria-label*="voice" i]',
    'button[aria-label*="dictate" i]'
  ].join(",");
  let surface=null, scheduled=false;
  const html=document.documentElement;

  function visible(element) {
    const r=element.getBoundingClientRect();
    return r.width>=220 && r.height>=38 && r.height<=420 &&
      r.right>0 && r.left<innerWidth && r.bottom>0 && r.top<innerHeight;
  }
  function findEditor() {
    for(const element of document.querySelectorAll(EDITOR)){
      if(!(element instanceof HTMLElement))continue;
      // Avoid unrelated editable fields and modal editors.
      if(element.closest('[role="dialog"],[role="menu"],[data-petrifyui-menu]'))continue;
      const r=element.getBoundingClientRect();
      if(r.width<75 || r.height<12 || r.bottom<innerHeight*.38)continue;
      return element;
    }
    return null;
  }
  function locateSurface(editor) {
    const er=editor.getBoundingClientRect();
    let best=null, score=-Infinity;
    for(let element=editor.parentElement,level=0;element && level<9;element=element.parentElement,level++){
      if(!(element instanceof HTMLElement) || !visible(element))continue;
      if(element===document.body || element===document.documentElement)break;
      const r=element.getBoundingClientRect();
      if(r.width<er.width*.85 || r.height<er.height || r.top<innerHeight*.32)continue;
      const buttons=element.querySelectorAll('button,[role="button"]');
      if(buttons.length<1)continue;
      const computed=getComputedStyle(element);
      const radius=parseFloat(computed.borderTopLeftRadius)||0;
      const painted=computed.backgroundColor!=="transparent" &&
        computed.backgroundColor!=="rgba(0, 0, 0, 0)";
      const nativeComposer=element.matches(
        '#composer-background,[data-testid="composer-root"],[data-testid="composer-background"],form[data-type="unified-composer"]'
      );
      const widthMatch=Math.abs(r.width-er.width);
      const scoreNow=(nativeComposer?70:0)+(radius>=12?34:0)+(painted?15:0)+
        Math.min(buttons.length,5)*4 - level*4 - Math.max(0,r.height-190)*.25 -
        widthMatch*.015;
      if(scoreNow>score){score=scoreNow;best=element;}
      // Once at a full page-size container, stop climbing.
      if(r.height>innerHeight*.50)break;
    }
    return best;
  }
  function decorate() {
    scheduled=false;
    if(document.hidden || !html.hasAttribute("data-petrifyui-active")) {
      surface?.removeAttribute("data-petrifyui-composer");
      surface=null;return;
    }
    const editor=findEditor();
    const next=editor?locateSurface(editor):null;
    if(surface!==next){
      surface?.removeAttribute("data-petrifyui-composer");
      surface=next;
    }
    if(!surface)return;
    if(!surface.hasAttribute("data-petrifyui-composer"))
      surface.setAttribute("data-petrifyui-composer","");
    // Only label known send/voice controls; never modify actual button behavior.
    for(const prior of surface.querySelectorAll("[data-petrifyui-composer-action]"))
      if(!prior.matches(ACTION))prior.removeAttribute("data-petrifyui-composer-action");
    for(const button of surface.querySelectorAll(ACTION))
      button.setAttribute("data-petrifyui-composer-action","");
  }
  function schedule(){
    if(scheduled || document.hidden)return;
    scheduled=true;
    requestAnimationFrame(decorate);
  }
  const initial=()=>{schedule();setTimeout(schedule,300);setTimeout(schedule,1100);};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initial,{once:true});
  else initial();
  document.addEventListener("focusin",e=>{
    if(e.target instanceof Element && (e.target.matches(EDITOR) || e.target.closest('[data-petrifyui-composer]')))schedule();
  },{passive:true});
  document.addEventListener("pointerdown",e=>{
    if(e.target instanceof Element && (
      e.target.closest('[data-petrifyui-composer]') ||
      e.target.closest('#prompt-textarea,[data-testid="prompt-textarea"]')
    ))schedule();
  },{passive:true});
  document.addEventListener("input",e=>{
    if(e.target instanceof Element && e.target.matches(EDITOR))schedule();
  },{passive:true});
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)schedule();});
  window.addEventListener("resize",schedule,{passive:true});
  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area==="local"&&changes.enabled)schedule();
  });
})();
