from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from .transcript_service import fetch_transcript
from .llm import get_llm_provider
from dotenv import load_dotenv

load_dotenv()

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
    provider: str = None
    include_core: bool = True
    include_sections: bool = True
    length_mode: str = "normal"
    model: str = None

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
            
            transcript, video_duration = fetch_transcript(request.url)
            
            # 2. Summarize
            if len(transcript) > 100000:
                yield json.dumps({"type": "status", "message": "Truncating transcript (too long)..."}) + "\n"
                transcript = transcript[:100000] + "...(truncated)"
            
            # debug log the transcript to STDOUT
            print(f"Transcript: {transcript}")

            yield json.dumps({"type": "status", "message": f"Generating summary with {request.provider or 'default'}..."}) + "\n"
            await asyncio.sleep(0.1)
            
            provider = get_llm_provider(request.provider)
            summary = provider.summarize_text(
                transcript, 
                include_core=request.include_core, 
                include_sections=request.include_sections, 
                length_mode=request.length_mode,
                model_name=request.model
            )
            
            # Calculate reading time (average 200 words per minute)
            word_count = len(summary.split())
            reading_time_seconds = (word_count / 200) * 60
            
            yield json.dumps({
                "type": "result", 
                "summary": summary,
                "video_duration": video_duration,
                "reading_time": reading_time_seconds,
                "word_count": word_count
            }) + "\n"
            
        except ValueError as ve:
             yield json.dumps({"type": "error", "message": str(ve)}) + "\n"
        except Exception as e:
             yield json.dumps({"type": "error", "message": str(e)}) + "\n"

    return StreamingResponse(event_generator(), media_type="application/x-ndjson")


@app.get("/health")
async def health_check():
    return {"status": "ok"}

@app.get("/api/models/{provider}")
async def list_models(provider: str):
    if provider == "gemini":
        try:
            import google.generativeai as genai
            import os
            api_key = os.environ.get("GEMINI_API_KEY")
            if not api_key:
                 return {"models": []}
            genai.configure(api_key=api_key)
            models = []
            for m in genai.list_models():
                if 'generateContent' in m.supported_generation_methods:
                    # m.name is like 'models/gemini-pro'
                    models.append(m.name.replace("models/", ""))
            return {"models": models}
        except Exception as e:
            print(f"Error fetching Gemini models: {e}")
            return {"models": []}
            
    elif provider == "ollama":
        try:
            with open("backend/ollama_models.json", "r") as f:
                models = json.load(f)
            return {"models": models}
        except FileNotFoundError:
            return {"models": []}
        except Exception as e:
            print(f"Error fetching Ollama models: {e}")
            return {"models": []}
            
    else:
        raise HTTPException(status_code=400, detail="Unknown provider")
