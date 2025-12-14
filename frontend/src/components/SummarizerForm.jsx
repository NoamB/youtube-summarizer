
import { useState } from 'react';

function SummarizerForm({ onSummarize, isLoading, statusText, provider, setProvider, options, setOptions }) {
    const [url, setUrl] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (url.trim()) {
            onSummarize(url);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="w-full max-w-lg mx-auto mb-10 animate-slide-up">
            <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-secondary rounded-lg blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
                <div className="relative flex flex-col">
                    <div className="flex w-full">
                        <input
                            type="text"
                            className="block w-full p-4 pl-10 text-sm text-white bg-card border border-gray-600 rounded-l-lg focus:ring-primary focus:border-primary placeholder-gray-400 outline-none"
                            placeholder="Paste YouTube URL here..."
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            disabled={isLoading}
                        />
                        <select
                            value={provider}
                            onChange={(e) => setProvider(e.target.value)}
                            disabled={isLoading}
                            className="bg-gray-700 text-white text-sm border-y border-l border-gray-600 focus:ring-primary focus:border-primary px-4 py-4 outline-none transition-colors hover:bg-gray-600 cursor-pointer"
                        >
                            <option value="ollama">Ollama</option>
                            <option value="gemini">Gemini</option>
                        </select>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="text-white bg-gradient-to-r from-primary to-secondary hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-purple-300 font-medium rounded-r-lg text-sm px-5 py-2.5 text-center disabled:opacity-50 disabled:cursor-not-allowed transition-all min-w-[120px]"
                        >
                            {isLoading ? (
                                <div className="flex items-center justify-center">
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                </div>
                            ) : 'Summarize'}
                        </button>
                    </div>

                    {/* Options Section */}
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                        <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                            <h3 className="text-sm font-semibold text-gray-300 mb-3">Content</h3>
                            <div className="space-y-2">
                                <label className="flex items-center space-x-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={options.includeCore}
                                        onChange={(e) => setOptions({ ...options, includeCore: e.target.checked })}
                                        className="form-checkbox h-5 w-5 text-primary rounded border-gray-600 bg-gray-700 focus:ring-offset-gray-800 focus:ring-2 focus:ring-primary transition duration-150 ease-in-out"
                                    />
                                    <span className="text-gray-400 text-sm group-hover:text-white transition-colors">Main core points</span>
                                </label>
                                <label className="flex items-center space-x-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={options.includeSections}
                                        onChange={(e) => setOptions({ ...options, includeSections: e.target.checked })}
                                        className="form-checkbox h-5 w-5 text-primary rounded border-gray-600 bg-gray-700 focus:ring-offset-gray-800 focus:ring-2 focus:ring-primary transition duration-150 ease-in-out"
                                    />
                                    <span className="text-gray-400 text-sm group-hover:text-white transition-colors">Key points by section</span>
                                </label>
                            </div>
                        </div>

                        <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                            <h3 className="text-sm font-semibold text-gray-300 mb-3">Length</h3>
                            <div className="space-y-2">
                                <label className="flex items-center space-x-3 cursor-pointer group">
                                    <input
                                        type="radio"
                                        name="length"
                                        value="normal"
                                        checked={options.lengthMode === 'normal'}
                                        onChange={(e) => setOptions({ ...options, lengthMode: e.target.value })}
                                        className="form-radio h-5 w-5 text-secondary border-gray-600 bg-gray-700 focus:ring-offset-gray-800 focus:ring-2 focus:ring-secondary transition duration-150 ease-in-out"
                                    />
                                    <span className="text-gray-400 text-sm group-hover:text-white transition-colors">Normal</span>
                                </label>
                                <label className="flex items-center space-x-3 cursor-pointer group">
                                    <input
                                        type="radio"
                                        name="length"
                                        value="extra_short"
                                        checked={options.lengthMode === 'extra_short'}
                                        onChange={(e) => setOptions({ ...options, lengthMode: e.target.value })}
                                        className="form-radio h-5 w-5 text-secondary border-gray-600 bg-gray-700 focus:ring-offset-gray-800 focus:ring-2 focus:ring-secondary transition duration-150 ease-in-out"
                                    />
                                    <span className="text-gray-400 text-sm group-hover:text-white transition-colors">Extra Short (One sentence/point)</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {statusText && (
                        <div className="absolute top-full left-0 w-full mt-2 text-center text-sm text-purple-300 animate-pulse font-medium">
                            {statusText}
                        </div>
                    )}
                </div>
            </div>
        </form>
    );
}

export default SummarizerForm;

