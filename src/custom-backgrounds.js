/* Local-only custom image manager.
 * Storage is extension-local; no image leaves this browser or enters GitHub.
 * Resource URLs are canvas-normalized in popup before saving. */
(() => {
  "use strict";
  const key="puiCustomBackgrounds";
  const vars={
    scene:["--pui-custom-scene"],
    wood:["--pui-custom-wood"],
    paper:["--pui-custom-paper"]
  };
  let serial=0;
  function apply(data){
    for(const [slot,names] of Object.entries(vars)){
      const candidate=data?.[slot];
      const src=typeof candidate==="string"&&/^data:image\/(?:webp|png|jpeg);base64,[a-zA-Z0-9+/=]+$/.test(candidate)
        ?candidate:null;
      for(const name of names){
        if(src)document.documentElement.style.setProperty(name,'url("'+src+'")');
        else document.documentElement.style.removeProperty(name);
      }
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
