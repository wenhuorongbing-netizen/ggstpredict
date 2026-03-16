from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from playwright.async_api import async_playwright
import os
import json
import asyncio
import re
from google import genai

app = FastAPI()

# Make sure to set GEMINI_API_KEY environment variable
api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    print("WARNING: GEMINI_API_KEY environment variable is not set. Gemini API calls will fail.")
client = genai.Client() # Automatically uses GEMINI_API_KEY

startgg_token = os.environ.get("STARTGG_TOKEN")
if not startgg_token:
    print("WARNING: STARTGG_TOKEN is not set. Start.gg API integrations may fail if added.")

class CrawlRequest(BaseModel):
    url: str

class CrawlPlayersRequest(BaseModel):
    players: list[str]

class ScrapeBracketRequest(BaseModel):
    url: str

def sanitize_name(name: str) -> str:
    return re.sub(r'[^a-z0-9]', '', name.lower())

@app.post("/crawl")
async def crawl(request: CrawlRequest):
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                extra_http_headers={
                    "Accept-Language": "en-US,en;q=0.9",
                    "Referer": "https://www.google.com/"
                }
            )
            page = await context.new_page()
            await page.goto(request.url, wait_until="domcontentloaded", timeout=30000)
            text_content = await page.evaluate("() => document.body.innerText")
            await browser.close()

        if not text_content:
            raise HTTPException(status_code=400, detail="Could not extract text from the provided URL.")

        prompt = f"""Extract match-ups from this FGC tournament text. Return ONLY a JSON array of strings formatted exactly as 'PlayerA (CharA) vs PlayerB (CharB)' or 'PlayerA vs PlayerB'.

Text to analyze:
{text_content[:30000]} # Limit text length to avoid token limits
"""

        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )

        # Parse the response text to ensure it's valid JSON
        response_text = response.text.strip()

        # Often Gemini might wrap it in ```json ... ```
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]

        response_text = response_text.strip()

        try:
            matches = json.loads(response_text)
            if not isinstance(matches, list):
                raise ValueError("Response is not a JSON array")
        except json.JSONDecodeError:
            print(f"Failed to parse JSON from Gemini response: {response_text}")
            return {"error": "Failed to parse matches from AI response", "raw_response": response_text}

        return {"matches": matches}

    except Exception as e:
        print(f"Error during crawl: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/crawl-players")
async def crawl_players(request: CrawlPlayersRequest):
    try:
        save_dir = os.path.join(os.path.dirname(__file__), "..", "public", "assets", "players")
        os.makedirs(save_dir, exist_ok=True)

        results = {"success": [], "failed": [], "skipped": []}

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                extra_http_headers={
                    "Accept-Language": "en-US,en;q=0.9",
                    "Referer": "https://liquipedia.net/"
                }
            )
            page = await context.new_page()

            for player_name in request.players:
                sanitized_name = sanitize_name(player_name)
                if not sanitized_name:
                    continue

                file_path = os.path.join(save_dir, f"{sanitized_name}.png")

                if os.path.exists(file_path):
                    results["skipped"].append(player_name)
                    continue

                # Navigate to liquipedia
                # Note: prioritize GGST/Guilty Gear sections if possible but general fighter page is usually ok
                url = f"https://liquipedia.net/fighters/{player_name}"
                try:
                    response = await page.goto(url, wait_until="domcontentloaded", timeout=15000)
                    if response and response.status == 404:
                        results["failed"].append(player_name)
                    else:
                        # try to find infobox image
                        image_element = await page.query_selector(".infobox-image img")
                        if image_element:
                            img_url = await image_element.get_attribute("src")
                            if img_url:
                                if img_url.startswith('/'):
                                    img_url = f"https://liquipedia.net{img_url}"

                                # Download image
                                img_response = await page.request.get(img_url)
                                if img_response.status == 200:
                                    img_bytes = await img_response.body()
                                    with open(file_path, "wb") as f:
                                        f.write(img_bytes)
                                    results["success"].append(player_name)
                                else:
                                    results["failed"].append(player_name)
                            else:
                                results["failed"].append(player_name)
                        else:
                            results["failed"].append(player_name)
                except Exception as loop_e:
                    print(f"Error crawling {player_name}: {loop_e}")
                    results["failed"].append(player_name)

                await asyncio.sleep(2)  # Avoid rate limiting

            await browser.close()

        return results

    except Exception as e:
        print(f"Error during crawl-players: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/scrape-bracket")
async def scrape_bracket(request: ScrapeBracketRequest):
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                extra_http_headers={
                    "Accept-Language": "en-US,en;q=0.9",
                    "Referer": "https://www.google.com/"
                }
            )
            page = await context.new_page()
            await page.goto(request.url, wait_until="domcontentloaded", timeout=30000)

            # Additional wait to let dynamic bracket trees render (like start.gg)
            await page.wait_for_timeout(3000)

            text_content = await page.evaluate("() => document.body.innerText")
            await browser.close()

        if not text_content:
            raise HTTPException(status_code=400, detail="Could not extract text from the provided URL.")

        prompt = f"""Extract FGC match-ups from the following raw tournament bracket text.
Look for typical VS formatting or adjacent player names.
Return ONLY a JSON array of strings formatted exactly as 'PlayerA vs PlayerB'.
No extra text, no markdown block outside of the JSON array.

Text to analyze:
{text_content[:30000]}
"""
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )

        response_text = response.text.strip()

        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]

        response_text = response_text.strip()

        try:
            matches = json.loads(response_text)
            if not isinstance(matches, list):
                raise ValueError("Response is not a JSON array")
        except json.JSONDecodeError:
            print(f"Failed to parse JSON from Gemini response: {response_text}")
            return {"error": "Failed to parse matches from AI response", "raw_response": response_text}

        return {"matches": matches}

    except Exception as e:
        print(f"Error during scrape-bracket: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
