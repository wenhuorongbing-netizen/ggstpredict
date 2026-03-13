from fastapi import FastAPI, Request, BackgroundTasks
from fastapi.templating import Jinja2Templates
from fastapi.responses import StreamingResponse
import asyncio
import logging
from bot import GeminiBot
import json

app = FastAPI()
templates = Jinja2Templates(directory="templates")
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Global bot instance to maintain session state asynchronously
bot = None
# A simple async lock to prevent concurrent executions messing up the browser
bot_lock = None

@app.on_event("startup")
async def startup_event():
    global bot_lock
    bot_lock = asyncio.Lock()

async def get_bot():
    global bot
    if bot is None:
        try:
            new_bot = GeminiBot()
            await new_bot.initialize()
            bot = new_bot
        except Exception as e:
            logging.error(f"Failed to initialize Gemini Bot: {e}")
            raise Exception("Failed to initialize bot. Ensure Chrome profile path is valid.")
    return bot

@app.get("/")
async def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/crawl")
async def crawl_awt():
    """
    Mock endpoint to simulate scraping AWT Korea tournament data.
    To be replaced with actual Playwright scraping logic in the future.
    """
    await asyncio.sleep(2) # Simulate network/scraping delay
    return {
        "status": "success",
        "data": [
            "TempestNYC vs UMISHO",
            "Sanwa vs Daru_I-No",
            "Tyurara vs Gobou"
        ]
    }

@app.post("/execute")
async def execute_workflow(request: Request):
    async def error_stream(msg: str):
        yield f"data: {json.dumps({'error': msg})}\n\n"

    if bot_lock.locked():
        # Reject new requests if a workflow is already running to protect the browser instance
        return StreamingResponse(error_stream("A workflow is currently running. Please wait for it to finish."), media_type="text/event-stream")

    try:
        data = await request.json()
    except Exception as e:
        return StreamingResponse(error_stream(f"Invalid JSON payload: {str(e)}"), media_type="text/event-stream")

    steps = data.get('steps', [])

    if not steps:
        return StreamingResponse(error_stream("No steps provided in workflow."), media_type="text/event-stream")

    # Acquire the lock after payload parsing to prevent deadlocks on invalid requests
    try:
        await asyncio.wait_for(bot_lock.acquire(), timeout=0.1)
    except asyncio.TimeoutError:
        return StreamingResponse(error_stream("A workflow is currently running. Please wait for it to finish."), media_type="text/event-stream")

    async def event_generator():
        try:
            try:
                current_bot = await get_bot()
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
                return

            results = {}

            for index, step in enumerate(steps):
                step_id = index + 1
                prompt_template = step.get('prompt', '')
                new_chat = step.get('new_chat', False)

                logging.info(f"Executing Step {step_id}")
                yield f"data: {json.dumps({'step': step_id, 'status': 'Starting', 'message': f'Executing Step {step_id}...'})}\n\n"

                try:
                    if new_chat:
                        yield f"data: {json.dumps({'step': step_id, 'status': 'New Chat', 'message': 'Starting new chat...'})}\n\n"
                        await current_bot.start_new_chat()

                    # Smart Context Injection: Replace {{OUTPUT_X}} with actual results
                    final_prompt = prompt_template
                    for past_id, past_output in results.items():
                        tag = f"{{{{OUTPUT_{past_id}}}}}"
                        if tag in final_prompt:
                            final_prompt = final_prompt.replace(tag, past_output)

                    yield f"data: {json.dumps({'step': step_id, 'status': 'Sending', 'message': 'Sending prompt to Gemini...'})}\n\n"
                    # Send the final compiled prompt to the bot
                    await current_bot.send_prompt(final_prompt)

                    # Wait for the generation to finish
                    yield f"data: {json.dumps({'step': step_id, 'status': 'Waiting', 'message': 'Waiting for Gemini response...'})}\n\n"
                    await current_bot.wait_for_response()

                    # Extract the output
                    yield f"data: {json.dumps({'step': step_id, 'status': 'Extracting', 'message': 'Extracting response text...'})}\n\n"
                    response_text = await current_bot.get_last_response()

                    results[str(step_id)] = response_text

                    yield f"data: {json.dumps({'step': step_id, 'status': 'Complete', 'result': response_text})}\n\n"
                    logging.info(f"Step {step_id} completed successfully.")

                except Exception as e:
                    error_msg = f"Error in Step {step_id}: {str(e)}"
                    logging.error(error_msg)
                    results[str(step_id)] = f"[FAILED] {error_msg}"
                    yield f"data: {json.dumps({'step': step_id, 'status': 'Error', 'result': results[str(step_id)]})}\n\n"
                    # If a critical error occurs, break the workflow to avoid cascaded failures
                    break

            yield f"data: {json.dumps({'status': 'Workflow Finished', 'results': results})}\n\n"
        finally:
            bot_lock.release()

    # We use StreamingResponse to send Server-Sent Events (SSE) back to the client
    # This prevents the long-running process from timing out the HTTP connection
    # and provides real-time feedback to the UI.
    return StreamingResponse(event_generator(), media_type="text/event-stream")

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=5000)