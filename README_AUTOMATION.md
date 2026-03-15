# Guilty Gear Strive Prediction Bureau: Automation & Scraping

This document outlines the setup and usage for Epic 10: "Data & Asset Automation".

## 1. Universal Playwright Scraper (Python FastAPI)

The Python backend is designed to scrape any tournament bracket URL (like start.gg, challonge) and use Google's Gemini API to intelligently extract match-ups in the format `PlayerA vs PlayerB`.

### Setup

1. **Navigate to the directory:**
   ```bash
   cd python-scraper
   ```

2. **Set up a virtual environment (Optional but recommended):**
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Install Playwright Browsers:**
   ```bash
   playwright install chromium
   ```

5. **Set your Gemini API Key:**
   ```bash
   export GEMINI_API_KEY="your_api_key_here"  # On Windows: set GEMINI_API_KEY="your_api_key_here"
   ```

6. **Run the server:**
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

### Usage

Send a POST request to `/crawl` with the URL you want to scrape:

```bash
curl -X POST http://localhost:8000/crawl \
     -H "Content-Type: application/json" \
     -d '{"url": "https://www.start.gg/tournament/evo-2024/event/guilty-gear-strive/brackets"}'
```

The response will be a JSON array of matches extracted by Gemini.

---

## 2. Character Portrait Fetcher (Node.js)

A standalone script to automatically download character portraits from the Dustloop Wiki. It includes caching, meaning it will skip downloading portraits that already exist in `public/assets/characters/`.

### Setup

Ensure you have installed the root project dependencies, as `axios` and `cheerio` are required.

```bash
# From the root of your Next.js project
npm install axios cheerio
```

### Usage

Run the script using Node.js:

```bash
node scripts/fetch_portraits.mjs
```

The script will:
1. Ensure `public/assets/characters/` exists.
2. Iterate through all GGST characters.
3. Check if the portrait exists locally.
4. If not, fetch it from Dustloop, download it, and save it as lowercase filename (e.g., `solbadguy.png`).
