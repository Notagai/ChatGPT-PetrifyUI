const toggle = document.querySelector("#enabled");
chrome.storage.local.get({ enabled: true }, prefs => {
  toggle.checked = prefs.enabled !== false;
});
toggle.addEventListener("change", () => {
  chrome.storage.local.set({ enabled: toggle.checked });
});

const diagnoseButton=document.querySelector("#diagnose");
const diagnoseStatus=document.querySelector("#diagnose-status");
diagnoseButton.addEventListener("click",async()=>{
  diagnoseButton.disabled=true;
  diagnoseStatus.textContent="Inspecting DOM styles locally…";
  try{
    const data=await window.petrifyInspect();
    const json=JSON.stringify(data,null,2);
    await navigator.clipboard.writeText(json);
    diagnoseStatus.textContent="Structural report copied to clipboard. Paste it into chat for analysis. No message content included.";
  }catch(error){
    diagnoseStatus.textContent="Inspection failed: "+String(error.message||error);
  }finally{
    diagnoseButton.disabled=false;
  }
});
