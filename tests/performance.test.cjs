// Node smoke/static tests: node tests/performance.test.cjs
const assert=require("node:assert/strict"),fs=require("node:fs");
const js=fs.readFileSync("src/sidebar.js","utf8");
const menus=fs.readFileSync("src/menus.js","utf8");
const css=fs.readFileSync("src/sidebar.css","utf8");
const manifest=JSON.parse(fs.readFileSync("manifest.json","utf8"));
for(const source of [js,menus])new Function(source);
assert.equal(manifest.version,"1.5.0");
assert(!js.includes('observe(document.documentElement,{childList:true,subtree:true})'));
assert(!menus.includes('subtree: true'));
assert(!js.includes('elementFromPoint'));
assert(!js.includes("data-petrifyui-header"));
assert(!js.includes("data-petrifyui-brand-trigger"));
assert(!js.includes('data-petrifyui-underlay'));
assert(!js.includes('data-petrifyui-row'));
assert(css.includes('[data-petrifyui-rail][data-petrifyui-enabled]'));
assert(js.includes('chrome.runtime.getURL("assets/"+name)'));
assert(js.includes('petrifyui-font-vt323'));
console.log("PASS: native header, rail, asset/font loading, reduced observer and row work");
