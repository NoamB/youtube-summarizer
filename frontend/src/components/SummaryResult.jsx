import ReactMarkdown from 'react-markdown';

function SummaryResult({ summary }) {
    if (!summary) return null;

    return (
        <div className="w-full max-w-2xl mx-auto bg-card bg-opacity-50 backdrop-filter backdrop-blur-lg rounded-xl p-8 shadow-2xl border border-gray-700 animate-fade-in text-left">
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
