import React, { useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import YouTube from 'react-youtube';

function SummaryResult({ summary, videoUrl }) {
    const playerRef = useRef(null);

    if (!summary) return null;

    const getYoutubeId = (url) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const videoId = getYoutubeId(videoUrl);

    // Convert timestamps (e.g., 01:23 or 1:02:30) to markdown links
    const formatTimestamps = (text) => {
        if (!text) return "";
        // Regex to match timestamps like 1:23, 12:34, 1:23:45
        // We use a lookboundary to avoid matching times inside other strings if possible, though simple regex often works.
        // Captures H:MM:SS or M:SS
        const regex = /\b(\d{1,2}:\d{2}(?::\d{2})?)\b/g;
        return text.replace(regex, '[$1](#seek-$1)');
    };

    const processedSummary = formatTimestamps(summary);

    const onPlayerReady = (event) => {
        playerRef.current = event.target;
    };

    const MarkdownComponents = {
        a: ({ href, children, ...props }) => {
            if (href && href.startsWith('#seek-')) {
                const timeStr = href.replace('#seek-', '');

                const handleClick = (e) => {
                    e.preventDefault();
                    if (playerRef.current) {
                        const parts = timeStr.split(':').map(Number);
                        let seconds = 0;
                        if (parts.length === 3) {
                            seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
                        } else {
                            seconds = parts[0] * 60 + parts[1];
                        }
                        playerRef.current.seekTo(seconds, true);
                        playerRef.current.playVideo();
                    }
                };

                return (
                    <a
                        href={href}
                        onClick={handleClick}
                        className="text-secondary hover:text-primary cursor-pointer font-bold no-underline hover:underline transition-colors"
                        {...props}
                    >
                        {children}
                    </a>
                );
            }
            return <a href={href} {...props} className="text-secondary hover:underline">{children}</a>;
        }
    };

    const playerOpts = {
        height: '100%',
        width: '100%',
        playerVars: {
            autoplay: 0,
        },
    };

    return (
        <div className="w-full max-w-2xl mx-auto bg-card bg-opacity-50 backdrop-filter backdrop-blur-lg rounded-xl p-8 shadow-2xl border border-gray-700 animate-fade-in text-left">
            {videoId && (
                <div className="mb-8 rounded-lg overflow-hidden shadow-lg border border-gray-600 aspect-video">
                    <YouTube
                        videoId={videoId}
                        opts={playerOpts}
                        onReady={onPlayerReady}
                        className="w-full h-full"
                        iframeClassName="w-full h-full"
                    />
                </div>
            )}
            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600 mb-6">
                Video Summary
            </h2>
            <div className="prose prose-invert prose-lg max-w-none text-gray-300">
                <ReactMarkdown components={MarkdownComponents}>
                    {processedSummary}
                </ReactMarkdown>
            </div>
        </div>
    );
}

export default SummaryResult;
