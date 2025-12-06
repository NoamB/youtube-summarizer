import ReactMarkdown from 'react-markdown';

function SummaryResult({ summary, videoUrl }) {
    if (!summary) return null;

    const getYoutubeId = (url) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const videoId = getYoutubeId(videoUrl);

    return (
        <div className="w-full max-w-2xl mx-auto bg-card bg-opacity-50 backdrop-filter backdrop-blur-lg rounded-xl p-8 shadow-2xl border border-gray-700 animate-fade-in text-left">
            {videoId && (
                <div className="mb-8 rounded-lg overflow-hidden shadow-lg border border-gray-600 aspect-video">
                    <iframe
                        width="100%"
                        height="100%"
                        src={`https://www.youtube.com/embed/${videoId}`}
                        title="YouTube video player"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        className="w-full h-full"
                    ></iframe>
                </div>
            )}
            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600 mb-6">
                Video Summary
            </h2>
            <div className="prose prose-invert prose-lg max-w-none text-gray-300">
                <ReactMarkdown>{summary}</ReactMarkdown>
            </div>
        </div>
    );
}

export default SummaryResult;
