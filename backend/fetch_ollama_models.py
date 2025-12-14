import json
import subprocess
import sys
from pathlib import Path

def fetch_ollama_models():
    """
    Fetches the list of available Ollama models using `ollama list`
    and saves them to a JSON file.
    """
    output_file = Path("backend/ollama_models.json")
    
    try:
        # Run `ollama list` command
        # The output format is usually:
        # NAME                ID              SIZE    MODIFIED
        # llama2:latest       78e26419b446    3.8 GB  2 days ago
        result = subprocess.run(["ollama", "list"], capture_output=True, text=True)
        
        if result.returncode != 0:
            print(f"Warning: Failed to run 'ollama list'. Error: {result.stderr}")
            # Save empty list if failed, so the file exists
            with open(output_file, "w") as f:
                json.dump([], f)
            return

        lines = result.stdout.strip().split('\n')
        models = []
        
        # Skip header line
        if len(lines) > 0 and "NAME" in lines[0] and "ID" in lines[0]:
            lines = lines[1:]

        for line in lines:
            if not line.strip():
                continue
            # The first column is the model name
            parts = line.split()
            if parts:
                models.append(parts[0])

        print(f"Found Ollama models: {models}")

        with open(output_file, "w") as f:
            json.dump(models, f)
            
    except FileNotFoundError:
        print("Warning: 'ollama' command not found.")
        with open(output_file, "w") as f:
            json.dump([], f)
    except Exception as e:
        print(f"Error fetching Ollama models: {e}")
        with open(output_file, "w") as f:
            json.dump([], f)

if __name__ == "__main__":
    # Ensure backend directory exists (script usually run from project root)
    Path("backend").mkdir(exist_ok=True)
    fetch_ollama_models()
