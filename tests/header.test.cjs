// Run: node tests/header.test.cjs
const fs=require("node:fs"),assert=require("node:assert/strict");
const js=fs.readFileSync("src/sidebar.js","utf8");
const css=fs.readFileSync("src/sidebar.css","utf8");
const m=JSON.parse(fs.readFileSync("manifest.json","utf8"));
new Function(js);
assert.equal(m.version,"1.7.0");
assert(js.includes("function findHeader()"));
assert(js.includes("document.elementFromPoint(18,24)"));
assert(!js.includes("MutationObserver"));
assert(!js.includes("ResizeObserver"));
assert(css.includes("[data-petrifyui-topbar]"));
assert(css.includes("var(--pui-resolved-wood,none)"));
assert(!css.includes("pointer-events:none"));
console.log("PASS: minimal header detection, wood background and untouched controls");
