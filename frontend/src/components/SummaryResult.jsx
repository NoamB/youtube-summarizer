import React from 'react';
import ReactMarkdown from 'react-markdown';

function SummaryResult({ summary, onSeek }) {
    if (!summary) return null;

    // Convert timestamps (e.g., 01:23 or 1:02:30) to markdown links
    const formatTimestamps = (text) => {
        if (!text) return "";
        // Regex to match timestamps like 1:23, 12:34, 1:23:45
        const regex = /\b(\d{1,2}:\d{2}(?::\d{2})?)\b/g;
        return text.replace(regex, '[$1](#seek-$1)');
    };

    const processedSummary = formatTimestamps(summary);

    const MarkdownComponents = {
        a: ({ href, children, ...props }) => {
            if (href && href.startsWith('#seek-')) {
                const timeStr = href.replace('#seek-', '');

                const handleClick = (e) => {
                    e.preventDefault();
                    const parts = timeStr.split(':').map(Number);
                    let seconds = 0;
                    if (parts.length === 3) {
                        seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
                    } else if (parts.length === 2) {
                        seconds = parts[0] * 60 + parts[1];
                    }

                    if (onSeek) {
                        onSeek(seconds);
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

    return (
        <div className="w-full max-w-2xl mx-auto bg-card bg-opacity-50 backdrop-filter backdrop-blur-lg rounded-xl p-8 shadow-2xl border border-gray-700 animate-fade-in text-left">
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
