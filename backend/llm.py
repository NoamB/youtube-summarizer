from abc import ABC, abstractmethod
import os
import requests
import json
import google.generativeai as genai

def generate_prompt(text: str, include_core: bool = True, include_sections: bool = True, length_mode: str = "normal") -> str:
    instructions = [
        "1. Use very short sentences. The shorter the better. The shortest needed to pass the message.",
        "2. Merge repeated points and ideas into one point.",
        "3. Make the text easy to read - spacious, no long blocks of text. Use indentation with titles and subtitles for easy context.",
        "4. Remove any promotional or self-promotional content.",
        "5. Use markdown to format the text."
    ]

    if length_mode == "extra_short":
        instructions.append("6. Write just one sentence per important key message.")
    else:
        instructions.append("6. Keep it short(not more than 500 words, 300 words is preferred) and to the point but don't miss any important insights and messages the speaker is trying to convey.")

    structure_instructions = []
    if include_core:
        structure_instructions.append("Start with short paragraph summarizing the key messages in the video in 3-5 bullets.")
    
    if include_sections:
        structure_instructions.append("Then provide a summary of key messages by section, providing timestamps for each section.")
    
    if not include_core and not include_sections:
         # Fallback if both are false, though UI shouldn't allow this ideally, or just simple summary
         structure_instructions.append("Provide a concise summary of the video.")

    return f"""
        You are a professional assistant that specializes in summarizing YouTube videos for busy C-level executives that don't have time to watch them.
       
        A transcript will be provided below.

        Please provide a super concise summary of the core points, following these guidelines:
        {chr(10).join(instructions)}

        {chr(10).join(structure_instructions)}

        Here is the transcript of a video:
        
        "{text}"
        """

class LLMProvider(ABC):
    @abstractmethod
    def summarize_text(self, text: str, **kwargs) -> str:
        pass

class OllamaProvider(LLMProvider):
    def __init__(self):
        self.api_url = "http://localhost:11434/api/generate"
        self.model_name = "gemma3:12b-it-qat"

    def summarize_text(self, text: str, **kwargs) -> str:
        prompt = generate_prompt(text, **kwargs)

        payload = {
            "model": self.model_name,
            "prompt": prompt,
            "stream": False
        }

        try:
            response = requests.post(self.api_url, json=payload)
            response.raise_for_status()
            result = response.json()
            return result.get("response", "No response from Ollama")
        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to communicate with Ollama: {str(e)}")

class GeminiProvider(LLMProvider):
    def __init__(self):
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
             raise ValueError("GEMINI_API_KEY environment variable is not set")
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.5-flash')

    def summarize_text(self, text: str, **kwargs) -> str:
        prompt = generate_prompt(text, **kwargs)
        
        try:
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            raise Exception(f"Failed to communicate with Gemini: {str(e)}")

def get_llm_provider(provider_name: str = None) -> LLMProvider:
    # 1. Use passed provider_name if available
    if provider_name:
        provider_name = provider_name.lower()
        if provider_name == "ollama":
             return OllamaProvider()
        elif provider_name == "gemini":
             return GeminiProvider()
        else:
            raise ValueError(f"Unknown LLM provider: {provider_name}")
    
    # 2. Fallback to environment variable, with 'gemini' as default
    env_provider = os.environ.get("LLM_PROVIDER", "gemini").lower()
    if env_provider == "ollama":
        return OllamaProvider()
    elif env_provider == "gemini":
        return GeminiProvider()
    else:
        raise ValueError(f"Unknown LLM provider specified in LLM_PROVIDER environment variable: {env_provider}")
