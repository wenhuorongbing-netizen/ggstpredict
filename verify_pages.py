import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Navigate to home first to be on the right origin
        await page.goto('http://localhost:3001/')

        # Set local storage using correct keys expected by the app
        await page.evaluate("""
            localStorage.setItem("userId", "1");
            localStorage.setItem("username", "Admin");
            localStorage.setItem("displayName", "Admin");
            localStorage.setItem("role", "ADMIN");
            localStorage.setItem("points", "1000");
        """)

        # Now navigate to leaderboard
        await page.goto('http://localhost:3001/leaderboard')

        # Wait for something on the leaderboard page
        await page.wait_for_selector('text=WANTED FIGHTERS', timeout=5000)
        await page.screenshot(path='/home/jules/verification/leaderboard.png')

        # Navigate to settings
        await page.goto('http://localhost:3001/settings')
        await page.wait_for_selector('text=SYSTEM SETTINGS', timeout=5000)
        await page.screenshot(path='/home/jules/verification/settings.png')

        await browser.close()

if __name__ == '__main__':
    asyncio.run(run())
