import { useState } from 'react';
import SummarizerForm from './components/SummarizerForm';
import SummaryResult from './components/SummaryResult';

function App() {
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState(null);
  const [currentVideoUrl, setCurrentVideoUrl] = useState(null);
  const [provider, setProvider] = useState('ollama');
  const [options, setOptions] = useState({
    includeCore: true,
    includeSections: true,
    lengthMode: 'normal'
  });

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
        body: JSON.stringify({
          url,
          provider,
          include_core: options.includeCore,
          include_sections: options.includeSections,
          length_mode: options.lengthMode
        }),
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

          let data;
          try {
            data = JSON.parse(line);
          } catch (e) {
            console.error("Error parsing stream JSON", e, line);
            continue;
          }

          if (data.type === 'status') {
            setStatusText(data.message);
          } else if (data.type === 'result') {
            setSummary(data.summary);
          } else if (data.type === 'error') {
            throw new Error(data.message);
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

      <SummarizerForm
        onSummarize={handleSummarize}
        isLoading={isLoading}
        statusText={statusText}
        provider={provider}
        setProvider={setProvider}
        options={options}
        setOptions={setOptions}
      />

      {error && (
        <div className="w-full max-w-lg mb-6 bg-red-900 border-2 border-red-500 rounded-lg p-4 shadow-lg animate-fade-in" role="alert">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-red-200" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3 w-full overflow-hidden">
              <h3 className="text-lg font-bold text-white mb-2">Error Occurred</h3>
              <div className="text-sm text-red-100 font-mono whitespace-pre-wrap break-words bg-red-950/50 p-2 rounded">
                {error}
              </div>
            </div>
          </div>
        </div>
      )}


      <SummaryResult summary={summary} videoUrl={currentVideoUrl} />
    </div>
  );
}

export default App;
