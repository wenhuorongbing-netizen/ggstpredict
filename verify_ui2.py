from playwright.sync_api import sync_playwright
import time

def verify_ui():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1920, 'height': 1080})
        page = context.new_page()

        page.goto("http://localhost:3000/")
        page.evaluate("localStorage.setItem('userId', 'cm7bshk960000a6u6b3lryix7');")
        page.evaluate("localStorage.setItem('username', 'admin');")
        page.evaluate("localStorage.setItem('role', 'ADMIN');")

        # Capture Dashboard
        print("Navigating to dashboard...")
        page.goto("http://localhost:3000/dashboard")
        page.wait_for_selector("text=AWT 2026 KOREA")
        time.sleep(2)
        page.screenshot(path="/home/jules/verification/dashboard.png", full_page=True)

        # Capture Bracket
        print("Navigating to bracket...")
        page.goto("http://localhost:3000/bracket")
        page.wait_for_selector("text=🔴 淘汰赛 (Knockout Stage)")
        bracket_tab = page.locator("button:has-text('🔴 淘汰赛 (Knockout Stage)')")
        bracket_tab.click()

        # Just screenshot what we get after clicking
        time.sleep(5)
        page.screenshot(path="/home/jules/verification/bracket.png", full_page=True)

        browser.close()

if __name__ == "__main__":
    verify_ui()
