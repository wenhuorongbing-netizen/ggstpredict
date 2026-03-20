from playwright.sync_api import Page, expect, sync_playwright
import time

def verify_dashboard_and_bracket(page: Page):
    page.set_viewport_size({"width": 1920, "height": 1080})

    # Authenticate via localStorage trick if possible, or we just look at what's visible
    page.goto("http://localhost:3000/")

    # Usually goes to /dashboard if logged in, let's just go there and trigger localstorage
    page.goto("http://localhost:3000/dashboard")
    page.evaluate("window.localStorage.setItem('userId', 'user123')")
    page.goto("http://localhost:3000/dashboard")
    time.sleep(3) # Wait for initial load

    page.screenshot(path="/home/jules/verification/dashboard.png", full_page=True)

    page.goto("http://localhost:3000/bracket")
    time.sleep(3)

    page.screenshot(path="/home/jules/verification/bracket.png", full_page=True)

if __name__ == "__main__":
    import os
    os.makedirs("/home/jules/verification", exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_dashboard_and_bracket(page)
        finally:
            browser.close()
