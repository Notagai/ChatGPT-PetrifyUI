/* Local-only custom image manager.
 * Storage is extension-local; no image leaves this browser or enters GitHub.
 * Resource URLs are canvas-normalized in popup before saving. */
(() => {
  "use strict";
  const key="puiCustomBackgrounds";
  const vars={
    scene:["--pui-ambient-art"],
    wood:["--pui-resolved-wood"],
    paper:["--pui-stage-paper","--pui-paper-composer","--pui-resolved-paper"]
  };
  const original={
    scene:chrome.runtime.getURL("assets/stage/ocean-pixel.png"),
    wood:chrome.runtime.getURL("assets/walnut-wood-v3.svg"),
    paper:chrome.runtime.getURL("assets/composer/paper-grain-geekify.svg")
  };
  let serial=0;
  function apply(data){
    for(const [slot,names] of Object.entries(vars)){
      const candidate=data?.[slot];
      const src=typeof candidate==="string"&&/^data:image\/(?:webp|png|jpeg);base64,[a-zA-Z0-9+/=]+$/.test(candidate)
        ?candidate:original[slot];
      const url='url("'+src+'")';
      for(const name of names)document.documentElement.style.setProperty(name,url);
    }
  }
  async function read(){
    const id=++serial;
    try {
      const result=await chrome.storage.local.get(key);
      if(id===serial)apply(result[key]||{});
    }catch(error){console.warn("[PetrifyUI] custom background loading failed",error);}
  }
  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area==="local"&&changes[key]){
      ++serial;apply(changes[key].newValue||{});
    }
  });
  void read();
})();
