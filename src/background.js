/* PetrifyUI font loader. Runs inside the extension, not the ChatGPT page. */
let activeFontRequest;
async function fetchFont() {
  if(!activeFontRequest) {
    activeFontRequest=(async()=>{
      const cssResponse=await fetch("https://fonts.googleapis.com/css2?family=VT323&display=swap");
      if(!cssResponse.ok)throw Error("VT323 CSS HTTP "+cssResponse.status);
      const fontCss=await cssResponse.text();
      const urls=[...fontCss.matchAll(/url\(\s*['"]?(https:\/\/fonts\.gstatic\.com\/[^'")\s]+)['"]?\s*\)/g)].map(m=>m[1]);
      if(!urls.length)throw Error("VT323 font file not found");
      const response=await fetch(urls[urls.length-1]);
      if(!response.ok)throw Error("VT323 file HTTP "+response.status);
      const bytes=await response.arrayBuffer();
      if(bytes.byteLength<1000||bytes.byteLength>400000)throw Error("Invalid font length");
      return Array.from(new Uint8Array(bytes));
    })().catch(err=>{activeFontRequest=null;throw err;});
  }
  return activeFontRequest;
}
chrome.runtime.onMessage.addListener((message,sender,respond)=>{
  if(message?.type!=="petrifyui-font-vt323")return false;
  fetchFont().then(bytes=>respond({ok:true,bytes}))
    .catch(err=>{
      console.warn("[PetrifyUI] VT323 unavailable; using monospace fallback.",err);
      respond({ok:false});
    });
  return true;
});
