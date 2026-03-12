<<<<<<< HEAD
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
=======
# Gemini Automation Chain Workflow Builder

A lightning-fast, local-first, low-code automation tool for chaining complex prompts through Google Gemini. This tool uses a **FastAPI backend** and **Playwright (async)** to manage conversation flow efficiently, without freezing the main thread or causing HTTP timeouts.

## Features

*   **⚡ Playwright Integration:** Much faster and more robust than Selenium. Uses an asynchronous event loop so it doesn't block.
*   **⚡ Real-Time Streaming (SSE):** The frontend receives live updates (e.g., "Typing prompt...", "Waiting for response...") as the bot operates, completely eliminating HTTP timeouts for long chains.
*   **Dynamic Workflow Engine:** Create infinitely expandable step-by-step chains.
*   **Smart Context Injection:** Use `{{OUTPUT_X}}` anywhere in your prompt to dynamically insert the exact response from step `X`.
*   **Persistent Login:** Uses a dedicated Chromium profile so you only need to log in to Google once.
*   **Prompt Library:** Save, edit, and quickly inject your favorite prompts directly from the sidebar.

## Prerequisites

*   Python 3.8+
*   A Google account with access to [Gemini](https://gemini.google.com/).

## Installation

1.  Clone this repository.
2.  Install dependencies and the Playwright browser binaries:
    ```bash
    pip install -r requirements.txt
    playwright install chromium
    ```

## First Run (Crucial!)

Because this tool relies on your personal Google account, **you must log in manually the very first time.**

1.  Start the FastAPI server:
    ```bash
    python app.py
    ```
2.  Open your browser to `http://localhost:5000`.
3.  Add a simple step (e.g., "Say hello") and click **Run Workflow**.
4.  **Wait.** A new Chromium window controlled by Playwright will appear.
5.  If it navigates to Gemini and asks you to log in, **do so manually in that automated window.**
6.  Once logged in and you see the chat interface, the bot will attempt to run your step. If it times out while you were logging in, simply run the workflow again from the UI.
7.  The login session is saved in the `chrome_profile` folder locally. Future runs will bypass the login screen.

## How to use Smart Injection (`{{OUTPUT_X}}`)

Instead of just blindly appending data to the end of a prompt, you can precisely control where previous context goes.

**Step 1 Prompt:**
`Summarize the plot of The Matrix in 3 sentences.`

**Step 2 Prompt:**
`Translate the following summary into Spanish:
---
{{OUTPUT_1}}
---
Make sure the tone is dramatic.`

You can easily insert these tags using the `+ {{OUTPUT_X}}` buttons above every text area!

## Disclaimer

This project relies on web scraping. Google may update the UI or DOM structure of Gemini at any time, which could break the selectors in `bot.py`. If the bot fails to find the input box or extract text, check the console logs and update the Playwright locators accordingly.
>>>>>>> 9e6ed47f6424da66380ed67101365f254e297116
