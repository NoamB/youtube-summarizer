try {
    importScripts('GeminiService.js');
} catch (e) {
    console.error(e);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'summarize') {
        handleSummarize(request, sendResponse);
        return true;
    }
    if (request.action === 'fetchText') {
        fetch(request.url, { credentials: 'include' })
            .then(res => {
                return res.text().then(text => {
                    return {
                        ok: res.ok,
                        status: res.status,
                        statusText: res.statusText,
                        text: text
                    };
                });
            })
            .then(result => sendResponse(result))
            .catch(err => sendResponse({ error: err.message }));
        return true;
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
