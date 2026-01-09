// Scripts loaded via manifest


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'summarize') {
        handleSummarize(request, sendResponse);
        return true; // Indicates we will respond asynchronously
    }
});

async function handleSummarize(request, sendResponse) {
    try {
        const { apiKey, model, text } = request;
        if (!apiKey) {
            sendResponse({ error: 'API Key not found' });
            return;
        }

        const summary = await GeminiService.summarize(apiKey, model, text);
        sendResponse({ summary });
    } catch (error) {
        console.error("Summarization error:", error);
        sendResponse({ error: error.message });
    }
}
