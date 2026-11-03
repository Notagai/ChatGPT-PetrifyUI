const assert=require("node:assert/strict");
const fs=require("node:fs");
const m=JSON.parse(fs.readFileSync("manifest.json","utf8"));
const js=fs.readFileSync("src/composer.js","utf8");
const css=fs.readFileSync("src/composer.css","utf8");
new Function(js);
assert.equal(m.version,"1.12.0");
for(const file of ["roller-left","roller-right","top-edge","bottom-edge","paper-tile"]){
 assert(m.web_accessible_resources[0].resources.includes("assets/composer/v2/"+file+".png"));
}
assert(js.includes("chrome.runtime.getURL"));
assert(css.includes("border-image-slice:18 5 18 5 fill"));
assert(css.includes("var(--pui-scroll-fill,none)"));
assert(css.includes(":not(:has(img))"));
assert(css.includes("[data-petrifyui-mode-button]"));
assert(!js.includes("MutationObserver"));
assert(!css.includes("../assets/"));
console.log("PASS: sliced pixel assets, original layout, no full-page observer");
