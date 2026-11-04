// node tests/custom-backgrounds-settings.test.cjs
"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const manifest=JSON.parse(fs.readFileSync("manifest.json","utf8"));
const scripts=manifest.content_scripts[0].js;
const styles=manifest.content_scripts[0].css;
assert(scripts.includes("src/settings.js"));
assert(scripts.includes("src/custom-backgrounds.js"));
assert(scripts.indexOf("src/core.js")<scripts.indexOf("src/settings.js"));
assert(styles.includes("src/settings.css"));
assert(manifest.permissions.includes("unlimitedStorage"));
for(const path of ["src/settings.js","src/custom-backgrounds.js","popup/backgrounds.js"]){
  new Function(fs.readFileSync(path,"utf8"));
}
const html=fs.readFileSync("popup/index.html","utf8");
assert(html.includes('src="backgrounds.js"'));
for(const slot of ["scene","wood","paper"]){
  assert(html.includes('id="background-'+slot+'"'));
  assert(html.includes('data-reset-background="'+slot+'"'));
}
const custom=fs.readFileSync("src/custom-backgrounds.js","utf8");
assert(custom.includes("chrome.storage.onChanged"),"Update after upload/reset");
assert(!custom.includes("MutationObserver"),"No constant DOM observer");
const popup=fs.readFileSync("popup/backgrounds.js","utf8");
assert(popup.includes('canvas.toDataURL("image/webp",.83)'),"Compressed before storing");
const settings=fs.readFileSync("src/settings.css","utf8");
assert(settings.includes("data-pui-settings"),"Settings scoped");
for(const css of ["src/sidebar.css","src/sidebar-panel.css","src/stage.css",
                  "src/composer.css","src/content-palette.css","src/settings.css"]){
  const content=fs.readFileSync(css,"utf8");
  assert(content.includes("--pui-custom-")||css==="src/content-palette.css",
    "Custom tokens wired to "+css);
}
console.log("PASS: Settings isolation, optimized local uploads, live update and fallback");
