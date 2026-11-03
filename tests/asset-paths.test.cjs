// Run: node tests/asset-paths.test.cjs
const assert = require("node:assert/strict");
const fs = require("node:fs");
const css = fs.readFileSync("src/sidebar.css","utf8");
const menus = fs.readFileSync("src/menus.css","utf8");
const js = fs.readFileSync("src/sidebar.js","utf8");
const worker = fs.readFileSync("src/background.js","utf8");
const manifest = JSON.parse(fs.readFileSync("manifest.json","utf8"));
for (const contents of [css, menus]) {
  assert(!contents.includes("../assets/"),"Page-relative asset URL in injected CSS");
  assert(!contents.includes("fonts.googleapis.com"),"CSP-blocked remote font import");
}
assert(!js.includes("fonts.googleapis.com"),"CSP-blocked font link in content script");
assert(js.includes('chrome.runtime.getURL("assets/"+name)'),"Must load extension assets by absolute URL");
assert(js.includes('new FontFace("Petrify VT323"'),"Must use byte-loaded FontFace");
assert(worker.includes("fonts.googleapis.com") && worker.includes("fonts.gstatic.com"),"Worker font loader missing");
assert.equal(manifest.background.service_worker,"src/background.js");
for(const asset of ["assets/walnut-wood-v3.svg","assets/paper-fiber-v2.svg","assets/brand-mark.svg"]) {
  assert(manifest.web_accessible_resources.some(x=>x.resources.includes(asset)),"Missing asset "+asset);
}
console.log("PASS: no page-relative CSS assets, CSP-safe VT323, manifest resources");
