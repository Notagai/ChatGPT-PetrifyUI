"""Synthetic browser smoke test. No ChatGPT account required."""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
html = (ROOT / "tests" / "fixture.html").read_text()

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(
        executable_path="/usr/bin/chromium", headless=True, args=["--no-sandbox"]
    )
    page = browser.new_page(viewport={"width": 1160, "height": 720})
    page.set_content(html)
    before = [page.locator(".project-link").nth(i).evaluate("el=>getComputedStyle(el).color") for i in range(2)]
    chat_style = page.locator("#main").evaluate("el=>getComputedStyle(el).backgroundColor")
    css = (ROOT / "src" / "sidebar.css").read_text()
    assert "fonts.googleapis.com/css2?family=VT323" in css
    # Offline fixture uses the browser fallback to avoid network-dependent tests.
    css = css.replace('@import url("https://fonts.googleapis.com/css2?family=VT323&display=swap");', "")
    page.add_style_tag(content=css)
    page.add_script_tag(content=(ROOT / "src" / "sidebar.js").read_text())
    page.wait_for_function("document.querySelector('#stage-slideover-sidebar').hasAttribute('data-petrifyui-enabled')")
    page.wait_for_function("document.querySelector('.sidebar-header').hasAttribute('data-petrifyui-enabled')")
    assert "walnut-tile.png" in page.locator(".sidebar-header").evaluate("el=>getComputedStyle(el).backgroundImage")
    assert page.locator("#scroll-list").get_attribute("data-petrifyui-scroll") is not None
    assert [page.locator(".project-link").nth(i).evaluate("el=>getComputedStyle(el).color") for i in range(2)] == before
    assert page.locator("#main").evaluate("el=>getComputedStyle(el).backgroundColor") == chat_style
    assert page.locator(".project-link").first.get_attribute("data-petrifyui-row") is None
    page.locator("#chatgpt-logo").click()
    assert page.evaluate("window.logoClicks") == 1
    page.evaluate("window.applySetting({enabled:{newValue:false}}, 'local')")
    page.wait_for_function("!document.querySelector('#stage-slideover-sidebar').hasAttribute('data-petrifyui-enabled')")
    assert page.locator(".sidebar-header").evaluate("el=>getComputedStyle(el).backgroundImage") == "none"
    print("PASS: header, project colors, scrollbar scope, logo click, main content untouched, toggle")
    browser.close()
