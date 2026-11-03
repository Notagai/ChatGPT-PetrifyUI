// Run: node tests/paper-composer.test.cjs
const assert=require("node:assert/strict"),fs=require("node:fs");
const m=JSON.parse(fs.readFileSync("manifest.json","utf8"));
const script=fs.readFileSync("src/composer.js","utf8");
const css=fs.readFileSync("src/composer.css","utf8");
const asset=fs.readFileSync("assets/composer/paper-grain-geekify.svg","utf8");
new Function(script);
assert.equal(m.version,"1.13.0");
assert(m.web_accessible_resources[0].resources.includes("assets/composer/paper-grain-geekify.svg"));
assert(!m.web_accessible_resources[0].resources.some(x=>x.includes("/scroll-")||x.includes("/roller-")));
assert(asset.includes('shape-rendering="crispEdges"'));
assert(css.includes("var(--pui-paper-composer,none)"));
assert(css.includes("background-size:256px 256px"));
assert(css.includes("data-petrifyui-mode-button"));
assert(css.includes("[data-pui-paper-inner]"));
assert(!css.includes("border-image"));
assert(!script.includes("MutationObserver"));
assert(!css.includes("../assets/"));
console.log("PASS: Geekify pixel paper tile, normal composer, live VT323 controls");
