import { useState } from 'react';
import SummarizerForm from './components/SummarizerForm';
import SummaryResult from './components/SummaryResult';

function App() {
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState(null);
  const [currentVideoUrl, setCurrentVideoUrl] = useState(null);

  const handleSummarize = async (url) => {
    setIsLoading(true);
    setError(null);
    setSummary(null);
    setStatusText('Starting...');
    setCurrentVideoUrl(url);

    try {
      const response = await fetch('http://localhost:8000/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        // Fallback for non-stream errors
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to start summarization');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');

        // Process complete lines
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if (data.type === 'status') {
              setStatusText(data.message);
            } else if (data.type === 'result') {
              setSummary(data.summary);
            } else if (data.type === 'error') {
              throw new Error(data.message);
            }
          } catch (e) {
            console.error("Error parsing stream JSON", e, line);
          }
        }
      }

    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsLoading(false);
      setStatusText('');
    }
  };

  return (
    <div className="min-h-screen bg-dark flex flex-col items-center py-20 px-4">
      <div className="text-center mb-16 animate-slide-up">
        <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary mb-4 filter drop-shadow-lg">
          Video Summarizer
        </h1>
        <p className="text-xl text-gray-400 font-light">
          Get the core points from any YouTube video in seconds.
        </p>
      </div>

      <SummarizerForm onSummarize={handleSummarize} isLoading={isLoading} statusText={statusText} />

      {error && (
        <div className="w-full max-w-lg p-4 mb-4 text-sm text-red-400 bg-gray-800 rounded-lg border border-red-800" role="alert">
          <span className="font-medium">Error:</span> {error}
        </div>
      )}

      <SummaryResult summary={summary} videoUrl={currentVideoUrl} />
    </div>
  );
}

export default App;
