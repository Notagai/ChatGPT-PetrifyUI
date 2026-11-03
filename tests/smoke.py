"""Smoke checks for PetrifyUI's appearance-only sidebar controls.
Run with: python tests/smoke.py (requires Playwright and Chromium).
No ChatGPT account or API usage.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
html = (ROOT / "tests" / "fixture.html").read_text()
html = html.replace('<link rel="stylesheet" href="../src/sidebar.css"/>', '')
html = html.replace('<script src="../src/sidebar.js" defer></script>', '')
html = html.replace('<meta charset="utf-8"/>',
                    '<meta charset="utf-8"/><base href="https://chatgpt.com/">')

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path="/usr/bin/chromium",
                                headless=True, args=["--no-sandbox"])
    page = browser.new_page(viewport={"width": 1160, "height": 720})
    page.set_content(html)
    original_text = page.locator(".shell").inner_text()
    main_style = page.locator("#main").evaluate(
        "el=>({bg:getComputedStyle(el).backgroundColor,font:getComputedStyle(el).fontFamily})")
    css = (ROOT / "src" / "sidebar.css").read_text()
    css = css.replace('@import url("https://fonts.googleapis.com/css2?family=VT323&display=swap");', '')
    page.add_style_tag(content=css)
    page.add_script_tag(content=(ROOT / "src" / "sidebar.js").read_text())
    page.wait_for_function(
        "document.querySelector('#stage-slideover-sidebar').hasAttribute('data-petrifyui-enabled')")
    sidebar = page.locator("#stage-slideover-sidebar")
    assert "walnut-grain-v2.svg" in sidebar.evaluate(
        "el=>getComputedStyle(el).backgroundImage")
    assert page.locator('[data-petrifyui-paper]').count() == 0, "No giant Recents paper panel"
    assert page.locator('a[href="/c/foo"]').get_attribute("data-petrifyui-row") is not None
    assert page.locator('a[href="/g/example-project"]').get_attribute("data-petrifyui-row") is not None
    assert page.locator(".shell").inner_text() == original_text
    assert page.locator("#main").evaluate(
        "el=>({bg:getComputedStyle(el).backgroundColor,font:getComputedStyle(el).fontFamily})") == main_style
    page.locator("#chatgpt-logo").click()
    assert page.evaluate("window.logoClicks") == 1
    page.evaluate("window.applySetting({enabled:{newValue:false}},'local')")
    page.wait_for_function(
        "!document.querySelector('#stage-slideover-sidebar').hasAttribute('data-petrifyui-enabled')")
    assert sidebar.evaluate("el=>getComputedStyle(el).backgroundImage") == "none"
    print("PASS: individual parchment labels, no giant panel, main chat intact, native logo and toggle")
    browser.close()
