from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.formatters import TextFormatter
import re

def get_video_id(url: str) -> str:
    """Extracts the video ID from a YouTube URL."""
    # Simple regex for standard and short URLs
    # Covers https://www.youtube.com/watch?v=VIDEO_ID and https://youtu.be/VIDEO_ID
    regex = r"(?:v=|\/)([0-9A-Za-z_-]{11}).*"
    match = re.search(regex, url)
    if match:
        return match.group(1)
    return None

def fetch_transcript(video_url: str) -> str:
    """Fetches the transcript for a given YouTube video URL."""
    video_id = get_video_id(video_url)
    if not video_id:
        raise ValueError("Invalid YouTube URL")

    try:
        # Revert to version 1.2.3 API: instance methods fetch()
        ytt_api = YouTubeTranscriptApi()
        fetched_transcript = ytt_api.fetch(video_id)
        
        formatter = TextFormatter()
        text_transcript = formatter.format_transcript(fetched_transcript)
        return text_transcript
    except Exception as e:
        raise Exception(f"Failed to fetch transcript: {str(e)}")

def clean_transcript(transcript_text: str) -> str:
    """
    Cleans the transcript text.
    The YouTubeTranscriptApi TextFormatter already does a good job,
    but we can add extra cleaning if needed here.
    """
    # Remove [Music], [Applause] etc if needed, but for now we keep it simple.
    return transcript_text
