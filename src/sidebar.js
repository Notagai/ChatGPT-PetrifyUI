/* PetrifyUI 1.6: zero sidebar DOM scanning.
   React can replace sidebar nodes at any time; CSS targets them directly. */
(() => {
  "use strict";
  const html=document.documentElement;
  if (html.hasAttribute("data-petrifyui-script")) return;
  html.setAttribute("data-petrifyui-script","");
  const lowPower=matchMedia("(prefers-reduced-motion: reduce)").matches ||
    navigator.connection?.saveData===true ||
    (typeof navigator.deviceMemory==="number"&&navigator.deviceMemory<=4) ||
    (typeof navigator.hardwareConcurrency==="number"&&navigator.hardwareConcurrency<=4);
  html.toggleAttribute("data-petrifyui-low-power",lowPower);

  // Default enabled, updated immediately when the local preference arrives.
  // This flag is on <html>, which React doesn't swap when rerendering the sidebar.
  html.setAttribute("data-petrifyui-active","");

  function applyPreference(enabled){
    html.toggleAttribute("data-petrifyui-active",enabled!==false);
  }

  async function addAsset(name,property,status) {
    const url=chrome.runtime.getURL("assets/"+name);
    html.style.setProperty(property, 'url("'+url+'")');
    try {
      const image=new Image();
      await new Promise((resolve,reject)=>{
        image.onload=()=>resolve();
        image.onerror=()=>reject(new Error("Image resource failed"));
        image.src=url;
      });
      html.dataset[status]="loaded";
    } catch {
      // A normal extension-owned fetch can work when direct image embedding is blocked.
      try {
        const result=await fetch(url);
        if(!result.ok) throw new Error("HTTP "+result.status);
        const svg=await result.text();
        const data="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg);
        html.style.setProperty(property,'url("'+data+'")');
        html.dataset[status]="loaded-data";
      }catch{
        html.style.setProperty(property,"none");
        html.dataset[status]="fallback";
      }
    }
  }

  function loadFont(){
    chrome.runtime.sendMessage({type:"petrifyui-font-vt323"},async result=>{
      if(chrome.runtime.lastError||!result?.ok||!Array.isArray(result.bytes)){
        html.dataset.petrifyuiFont="fallback";
        return;
      }
      try {
        const face=new FontFace("Petrify VT323",new Uint8Array(result.bytes).buffer,
          {weight:"400",style:"normal"});
        document.fonts.add(await face.load());
        html.dataset.petrifyuiFont="loaded";
      }catch{html.dataset.petrifyuiFont="fallback";}
    });
  }
  chrome.storage.local.get({enabled:true},settings=>applyPreference(settings.enabled));
  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area==="local"&&changes.enabled)applyPreference(changes.enabled.newValue);
  });
  void addAsset("walnut-wood-v3.svg","--pui-resolved-wood","petrifyuiTexture");
  void addAsset("paper-fiber-v2.svg","--pui-resolved-paper","petrifyuiPaper");
  loadFont();
})();
