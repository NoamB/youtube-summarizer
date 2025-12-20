# YouTube Video Summarizer

A web application that generates summaries of YouTube videos using either a local LLM (Ollama) or an online API (Gemini).

## Features
- **Video Summarization**: Fetches transcripts and generates structured summaries.
- **Embedded Player**: Watch the video directly on the results page.
- **Clickable Timestamps**: Timestamps in the summary are interactive links that seek the video to the specific time.
- **Progress Indicators**: Real-time feedback ("Fetching transcript...", "Generating summary..."). Tells you how much time you saved by not watching the video.
- **Premium UI**: Modern dark-mode interface built with React and Tailwind CSS.

## Prerequisites

Before you begin, ensure you have the following installed:
- [Python 3.9+](https://www.python.org/)
- [Node.js 18+](https://nodejs.org/)
- [Ollama](https://ollama.com/) (running locally)

## Setup Instructions

### 1. Ollama Setup
Install Ollama and pull the required model. The application is configured to use the model `gemma3:12b-it-qat` by default.

```bash
ollama serve
# In a new terminal:
ollama pull gemma3:12b-it-qat
```

### 2. Backend Setup
The backend is a FastAPI application.

```bash
cd backend
# Create a virtual environment (optional but recommended)
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r ../requirements.txt

# Environment variables - 'export' these in shell or put them in your .env file
LLM_PROVIDER=gemini # or 'ollama'
GEMINI_API_KEY=your_gemini_api_key # only needed if using Gemini

# Run the server
uvicorn backend.main:app --reload --port 8000
```
The backend API will be available at `http://localhost:8000`.

### 3. Frontend Setup
The frontend is a React application built with Vite.

```bash
cd frontend
# Install dependencies
npm install

# Run the development server
npm run dev
```
The application will be available at `http://localhost:5173`.

## Usage
1. Ensure both Backend (`uvicorn`) and Frontend (`npm run dev`) servers are running.
2. Ensure Ollama is running (`ollama serve`).
3. Open `http://localhost:5173` in your browser.
4. Paste a YouTube video URL (e.g., `https://www.youtube.com/watch?v=...`).
5. Click **Summarize**.
6. View the summary and click timestamps to jump to key moments in the video.
7. You'll need `google-generative-ai` api key for gemini provider.

## Running with Docker

The application can be run as a single Docker container containing both the frontend and backend.

### 1. Build the Image
```bash
./build_docker.sh
```

### 2. Run the Container
```bash
# Provide your Gemini API key if you plan to use it
export GEMINI_API_KEY=your_key_here
./run_docker.sh
```

- The UI will be available at `http://localhost:5173`.
- The Backend API will be available at `http://localhost:8000`.

> [!NOTE]
> By default, the Docker setup is configured to reach Ollama on your host machine using `host.docker.internal`. Ensure Ollama is running on your host. If you need to point to a different host, you can set the `OLLAMA_HOST` environment variable when running `run_docker.sh`.

## Tech Stack
- **Backend**: FastAPI, youtube-transcript-api, Requests
- **Frontend**: React, Vite, Tailwind CSS, React Markdown, React Youtube
- **AI**: Ollama (Local Inference)
