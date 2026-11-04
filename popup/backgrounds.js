
/* Custom backgrounds: local, bounded upload pipeline. */
(() => {
  const key="puiCustomBackgrounds";
  const status=document.querySelector("#background-status");
  const sizes={scene:2048,wood:1024,paper:1024};
  let busy=false;
  async function read(){
    const result=await chrome.storage.local.get(key);
    return result[key]&&typeof result[key]==="object"?result[key]:{};
  }
  function notice(message){status.textContent=message;}
  async function encode(file,maxWidth){
    if(!["image/png","image/jpeg","image/webp"].includes(file.type))
      throw Error("Use PNG, JPEG or WebP.");
    if(file.size>15*1024*1024)throw Error("Image exceeds the 15 MB source limit.");
    const bitmap=await createImageBitmap(file);
    try{
      const scale=Math.min(1,maxWidth/Math.max(bitmap.width,bitmap.height));
      const canvas=document.createElement("canvas");
      canvas.width=Math.max(1,Math.round(bitmap.width*scale));
      canvas.height=Math.max(1,Math.round(bitmap.height*scale));
      const ctx=canvas.getContext("2d",{alpha:false});
      if(!ctx)throw Error("Canvas unsupported.");
      ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
      const result=canvas.toDataURL("image/webp",.83);
      if(!result.startsWith("data:image/webp;"))throw Error("WebP encoding unavailable.");
      if(result.length>4*1024*1024)throw Error("Converted image is too large. Try a smaller image.");
      return result;
    }finally{bitmap.close();}
  }
  for(const slot of ["scene","wood","paper"]){
    const input=document.querySelector("#background-"+slot);
    const reset=document.querySelector('[data-reset-background="'+slot+'"]');
    input.addEventListener("change",async()=>{
      if(busy||!input.files?.[0])return;
      busy=true;notice("Processing "+slot+" image…");
      try{
        const image=await encode(input.files[0],sizes[slot]);
        const current=await read();
        await chrome.storage.local.set({[key]:{...current,[slot]:image}});
        notice("Saved "+slot+" background. Open ChatGPT to see it.");
      }catch(error){notice("Upload failed: "+String(error.message||error));}
      finally{input.value="";busy=false;}
    });
    reset.addEventListener("click",async()=>{
      if(busy)return;
      busy=true;
      try{
        const current=await read();delete current[slot];
        await chrome.storage.local.set({[key]:current});
        notice("Restored bundled "+slot+" background.");
      }catch(error){notice("Reset failed: "+String(error.message||error));}
      finally{busy=false;}
    });
  }
  void read().then(current=>{
    const chosen=Object.keys(current).filter(x=>["scene","wood","paper"].includes(x));
    if(chosen.length)notice("Custom backgrounds: "+chosen.join(", ")+".");
  }).catch(()=>{});
})();
