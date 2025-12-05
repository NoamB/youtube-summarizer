from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from .transcript_service import fetch_transcript
from .ollama_service import summarize_text

app = FastAPI()

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace with specific frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SummarizeRequest(BaseModel):
    url: str

from fastapi.responses import StreamingResponse
import json
import asyncio

@app.post("/api/summarize")
async def summarize_video(request: SummarizeRequest):
    async def event_generator():
        try:
            # 1. Fetch Transcript
            yield json.dumps({"type": "status", "message": "Fetching transcript..."}) + "\n"
            # Simple yield adjustment to ensure frontend receives it
            await asyncio.sleep(0.1) 
            
            transcript = fetch_transcript(request.url)
            
            # 2. Summarize
            if len(transcript) > 20000:
                yield json.dumps({"type": "status", "message": "Truncating transcript (too long)..."}) + "\n"
                transcript = transcript[:20000] + "...(truncated)"
            
            yield json.dumps({"type": "status", "message": "Generating summary with Ollama..."}) + "\n"
            await asyncio.sleep(0.1)
            
            summary = summarize_text(transcript)
            
            yield json.dumps({"type": "result", "summary": summary}) + "\n"
            
        except ValueError as ve:
             yield json.dumps({"type": "error", "message": str(ve)}) + "\n"
        except Exception as e:
             yield json.dumps({"type": "error", "message": str(e)}) + "\n"

    return StreamingResponse(event_generator(), media_type="application/x-ndjson")

@app.get("/health")
async def health_check():
    return {"status": "ok"}
