import { useState, useEffect, useRef } from 'react';
import YouTube from 'react-youtube';
import SummarizerForm from './components/SummarizerForm';
import SummaryResult from './components/SummaryResult';

function App() {
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState(null);
  const [url, setUrl] = useState('');
  const [provider, setProvider] = useState('gemini');
  const [model, setModel] = useState('');
  const [availableModels, setAvailableModels] = useState([]);
  const [timer, setTimer] = useState(0);
  const [timeMetrics, setTimeMetrics] = useState(null);
  const [options, setOptions] = useState({
    includeCore: true,
    includeSections: true,
    lengthMode: 'normal'
  });

  const videoPlayerRef = useRef(null);
  const videoContainerRef = useRef(null);

  useEffect(() => {
    let interval;
    if (isLoading) {
      interval = setInterval(() => {
        setTimer(prev => prev + 0.1);
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  // Fetch available models when provider changes
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/models/${provider}`);
        const data = await response.json();
        setAvailableModels(data.models || []);
        // Set default model
        if (data.models && data.models.length > 0) {
          // For gemini, prefer gemini-2.5-flash if available
          if (provider === 'gemini') {
            const preferred = data.models.find(m => m.includes('2.5-flash'));
            setModel(preferred || data.models[0]);
          } else {
            setModel(data.models[0]);
          }
        } else {
          setModel('');
        }
      } catch (e) {
        console.error('Error fetching models:', e);
        setAvailableModels([]);
        setModel('');
      }
    };
    fetchModels();
  }, [provider]);

  const handleSummarize = async (url) => {
    setIsLoading(true);
    setError(null);
    setSummary(null);
    setStatusText('Starting...');
    setTimer(0);

    try {
      const response = await fetch('http://localhost:8000/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          provider,
          model,
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
            setTimeMetrics({
              videoDuration: data.video_duration,
              readingTime: data.reading_time,
              wordCount: data.word_count
            });
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

  const getVideoId = (url) => {
    if (!url) return null;
    const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regExp);
    return match ? match[1] : null;
  };

  const videoId = getVideoId(url);

  const handleSeek = (seconds) => {
    if (videoPlayerRef.current) {
      videoPlayerRef.current.seekTo(seconds, true);
      videoPlayerRef.current.playVideo();

      // Scroll to video
      if (videoContainerRef.current) {
        videoContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const onPlayerReady = (event) => {
    videoPlayerRef.current = event.target;
  };

  const playerOpts = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 0,
    },
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
        onSummarize={() => handleSummarize(url)}
        isLoading={isLoading}
        statusText={statusText}
        provider={provider}
        setProvider={setProvider}
        model={model}
        setModel={setModel}
        availableModels={availableModels}
        options={options}
        setOptions={setOptions}
        url={url}
        setUrl={setUrl}
      />

      {/* Content Area */}
      {(videoId || summary || error) && (

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          {/* Video Column */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            {videoId && (
              <div ref={videoContainerRef} className="relative pt-[56.25%] rounded-lg overflow-hidden border border-gray-700 shadow-lg bg-black">
                <YouTube
                  videoId={videoId}
                  opts={playerOpts}
                  onReady={onPlayerReady}
                  className="absolute top-0 left-0 w-full h-full"
                  iframeClassName="w-full h-full"
                />
              </div>
            )}

            {/* Timer Display */}
            {(isLoading || timer > 0) && (
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 flex flex-col items-center justify-center">
                <span className="text-gray-400 text-xs uppercase tracking-wider mb-1">Generation Time</span>
                <span className={`font-mono font-bold text-3xl ${isLoading ? 'text-green-400 animate-pulse' : 'text-gray-200'}`}>
                  {timer.toFixed(1)}s
                </span>
              </div>
            )}

            {/* Time Saved Metrics */}
            {timeMetrics && (
              <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-lg p-4 border border-gray-700">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <span className="text-gray-400 text-xs uppercase tracking-wider block mb-1">Watch Time</span>
                    <span className="font-mono font-bold text-lg text-white">
                      {Math.floor(timeMetrics.videoDuration / 60)}:{String(Math.floor(timeMetrics.videoDuration % 60)).padStart(2, '0')}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-xs uppercase tracking-wider block mb-1">Read Time</span>
                    <span className="font-mono font-bold text-lg text-white">
                      {Math.floor(timeMetrics.readingTime / 60)}:{String(Math.floor(timeMetrics.readingTime % 60)).padStart(2, '0')}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-xs uppercase tracking-wider block mb-1">Time Saved</span>
                    <span className="font-mono font-bold text-lg text-green-400">
                      {Math.floor((timeMetrics.videoDuration - timeMetrics.readingTime) / 60)}:{String(Math.floor((timeMetrics.videoDuration - timeMetrics.readingTime) % 60)).padStart(2, '0')}
                    </span>
                  </div>
                </div>
                <div className="text-center mt-2 text-gray-500 text-xs">
                  {timeMetrics.wordCount} words • ~200 wpm reading speed
                </div>
              </div>
            )}
          </div>

          {/* Summary Column */}
          <div className="lg:col-span-2">
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6 text-red-200 animate-shake">
                <div className="flex items-center gap-3 mb-2">
                  <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-bold text-lg">Error Occurred</span>
                </div>
                <pre className="whitespace-pre-wrap font-mono text-sm">{error}</pre>
              </div>
            )}

            {summary && (
              <div className="animate-slide-up">
                <SummaryResult summary={summary} onSeek={handleSeek} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
