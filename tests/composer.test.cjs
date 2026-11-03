// Run: node tests/composer.test.cjs
const assert=require("node:assert/strict");
const fs=require("node:fs");
const m=JSON.parse(fs.readFileSync("manifest.json","utf8"));
const composer=fs.readFileSync("src/composer.css","utf8");
const side=fs.readFileSync("src/sidebar.js","utf8");
assert.equal(m.version,"1.9.0");
assert(m.content_scripts[0].css.includes("src/composer.css"));
assert(composer.includes("html[data-petrifyui-active]"));
assert(composer.includes("#composer-background"));
assert(composer.includes('form[data-type="unified-composer"]'));
assert(composer.includes("var(--pui-resolved-paper, none)"));
assert(composer.includes("button[data-testid=\"send-button\"]"));
assert(composer.includes('button[aria-label*="voice mode" i]'));
assert(!composer.includes("../assets/"));
assert(!composer.includes("MutationObserver"));
assert(side.includes('addAsset("paper-fiber-v2.svg"'));
console.log("PASS: scoped parchment composer, neutral action accents, existing asset loader");
