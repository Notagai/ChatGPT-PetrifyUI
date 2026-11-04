// node tests/sidebar-settings-recovery.test.cjs
const assert=require("node:assert/strict");
const fs=require("node:fs");
const read=p=>fs.readFileSync(p,"utf8");
for(const path of ["src/stage.js","src/settings.js","src/core.js"])
  new Function(read(path));
const sidebar=read("src/sidebar-panel.css");
const stage=read("src/stage.js");
const settings=read("src/settings.js");
const settingsCSS=read("src/settings.css");
assert(sidebar.includes("margin-bottom:90px !important"),
  "Navigation must reserve account overlay height");
assert(stage.includes("if(collapsed && cr)"),
  "Collapsed rail must position paper from composer");
assert(stage.includes('data-pui-sidebar-collapsed'),
  "Stage must expose collapsed state");
assert(settings.includes("function findNavigation()")&&
  settings.includes("Back to app"),
  "Settings overlays must be detected without pathname");
assert(settingsCSS.includes("[data-pui-settings-main]::before"),
  "Settings must paint parchment stage");
assert(settingsCSS.includes("[data-pui-settings-flow]"),
  "Settings structural layers must clear black paint");
assert(settings.includes('[role="menu"] span'),
  "Account menu Plus label must be considered");
assert(!settings.includes(".sidebar-navigation span.text-xs.text-secondary"),
  "Do not recolor sidebar account's Plus label");
console.log("PASS: sidebar, collapsed paper, Settings and menu regressions");
