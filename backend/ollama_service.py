import requests
import json

OLLAMA_API_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "gemma3:12b-it-qat" 

def summarize_text(text: str) -> str:
    """Sends text to Ollama for summarization."""
    
    prompt = f"""
    You are a professional assistant that specializes in summarizing YouTube videos for C-level executives.
   
    A transcript will be provided below.

    Please provide a super concise summary of the core points, following these guidelines:
    1. Use very short sentences. The shorter the better. The shortest needed to pass the message.
    2. Merge repeated points and ideas into one point.
    3. Make the text easy to read - spacious, no long blocks of text. Use indentation with titles and subtitles for easy context.
    4. Keep it short(not more than 500 words, 300 words is preferred) and to the point but don't miss any important insights and messages the speaker is trying to convey.
    5. Use markdown to format the text.
    6. Remove any promotional or self-promotional content.

    Here is the transcript of a video:
    
    "{text}"
    """

    payload = {
        "model": MODEL_NAME,
        "prompt": prompt,
        "stream": False
    }

    try:
        response = requests.post(OLLAMA_API_URL, json=payload)
        response.raise_for_status()
        result = response.json()
        return result.get("response", "No response from Ollama")
    except requests.exceptions.RequestException as e:
        raise Exception(f"Failed to communicate with Ollama: {str(e)}")
