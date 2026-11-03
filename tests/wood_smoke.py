"""Synthetic visual regression checks for PetrifyUI's walnut and selection styling.
Requires playwright and Chromium; no ChatGPT login or API requests.
"""
import base64
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
css = (ROOT / "src/sidebar.css").read_text()
css = css.replace('@import url("https://fonts.googleapis.com/css2?family=VT323&display=swap");', "")
wood = base64.b64encode((ROOT / "assets/walnut-wood-v3.svg").read_bytes()).decode("ascii")
css = css.replace('../assets/walnut-wood-v3.svg', f'data:image/svg+xml;base64,{wood}')

html = """<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;background:#14100e;font:16px Arial}.shell{width:340px;height:850px;display:flex;flex-direction:column}
header{height:46px;flex:0 0 auto}aside{flex:1;overflow:auto}#scroll{min-height:850px}
a{display:block;padding:9px;color:#f8ecda;text-decoration:none}
section{min-height:60px}
</style></head><body><div class="shell">
<header data-petrifyui-header data-petrifyui-enabled>ChatGPT</header>
<aside data-petrifyui-sidebar data-petrifyui-enabled>
<div id="scroll" data-petrifyui-scroll data-petrifyui-underlay>
<section data-petrifyui-underlay>
<a data-petrifyui-row data-petrifyui-row-kind="nav">New chat</a>
</section><section data-petrifyui-underlay>
<a data-petrifyui-row data-petrifyui-row-kind="project">Project</a>
<a href="/c/a" data-petrifyui-row data-petrifyui-row-kind="chat" data-petrifyui-selected>Selected</a>
<a href="/c/b" data-petrifyui-row data-petrifyui-row-kind="chat">Unselected</a>
</section></div></aside></div></body></html>"""
html = html.replace("</head>", f"<style>{css}</style></head>")

with sync_playwright() as p:
    launch = {"headless": True, "args": ["--no-sandbox"]}
    binary = os.environ.get("CHROMIUM_BIN")
    if binary:
        launch["executable_path"] = binary
    browser = p.chromium.launch(**launch)
    page = browser.new_page(viewport={"width": 340, "height": 850})
    page.set_content(html)
    sidebar = page.locator("aside")
    scroller = page.locator("#scroll")
    selected = page.locator("[data-petrifyui-selected]")
    inactive = page.locator('a[href="/c/b"]')
    assert "data:image" in sidebar.evaluate("e => getComputedStyle(e).backgroundImage")
    assert "data:image" in scroller.evaluate("e => getComputedStyle(e).backgroundImage")
    assert inactive.evaluate("e => getComputedStyle(e).backgroundColor") == "rgba(0, 0, 0, 0)"
    alpha = selected.evaluate("e => getComputedStyle(e).backgroundColor")
    assert alpha == "rgba(233, 185, 123, 0.19)", alpha
    assert selected.inner_text() == "Selected"
    sidebar.evaluate("e => e.removeAttribute('data-petrifyui-enabled')")
    assert sidebar.evaluate("e => getComputedStyle(e).backgroundImage") == "none"
    print("PASS: wood on sidebar and scroll layer, translucent selection, no inactive blocks, toggle")
    browser.close()
