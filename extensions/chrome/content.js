const BACKEND_URL = 'http://localhost:8000';

let summaryPanel = null;
let currentVideoId = null;

// Observe for navigation changes and DOM updates
let lastUrl = location.href;
const observer = new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
        lastUrl = url;
        onUrlChange();
    }
    // Always attempt to inject if we are on a watch page
    if (window.location.pathname.startsWith('/watch')) {
        injectButton();
    }
});
observer.observe(document, { subtree: true, childList: true });

function onUrlChange() {
    if (summaryPanel && summaryPanel.classList.contains('open')) {
        closePanel();
    }
}

function injectButton() {
    // Target: Action buttons under the video
    // YouTube's selector for the "Share/Download" button container
    const query = '#top-level-buttons-computed, #top-level-buttons';
    const container = document.querySelector(query);

    if (container && !document.getElementById('yt-summarizer-btn')) {
        const btn = document.createElement('button');
        btn.id = 'yt-summarizer-btn';
        btn.className = 'yt-summarizer-btn';
        btn.innerHTML = '✨ Summarize';
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            startSummarization();
        };

        // Append at the end of the common action buttons
        container.appendChild(btn);
    }
}

async function startSummarization() {
    const videoId = new URLSearchParams(window.location.search).get('v');
    if (!videoId) return;

    ensurePanelExists();
    openPanel();

    const content = summaryPanel.querySelector('.yt-summarizer-content');
    content.innerHTML = '<div class="yt-summarizer-status">Initializing...</div>';

    try {
        const settings = await chrome.storage.sync.get(['provider', 'model']);
        const provider = settings.provider || 'gemini';
        const model = settings.model || '';

        content.innerHTML = `<div class="yt-summarizer-status">Connecting to backend (${provider})...</div>`;

        const response = await fetch(`${BACKEND_URL}/api/summarize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: window.location.href, // This includes all query params
                provider: provider,
                model: model,
                include_core: true,
                include_sections: true,
                length_mode: 'normal'
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'Failed to start summarization');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullSummary = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const data = JSON.parse(line);
                    if (data.type === 'status') {
                        const statusEl = content.querySelector('.yt-summarizer-status');
                        if (statusEl) statusEl.textContent = data.message;
                    } else if (data.type === 'result') {
                        fullSummary = data.summary;
                        renderSummary(fullSummary);
                    } else if (data.type === 'error') {
                        throw new Error(data.message);
                    }
                } catch (e) {
                    console.error("Error parsing stream line", line, e);
                }
            }
        }
    } catch (err) {
        content.innerHTML = `<div class="yt-summarizer-error">Error: ${err.message}<br><br>Make sure the backend is running at ${BACKEND_URL}</div>`;
    }
}

function renderSummary(markdown) {
    const content = summaryPanel.querySelector('.yt-summarizer-content');

    // Improved logic for markdown-like rendering
    let html = markdown
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(/^\s*[\-\*] (.*$)/gim, '<li>$1</li>')
        .replace(/\*\*(.*)\*\*/gim, '<b>$1</b>')
        .replace(/\*(.*)\*/gim, '<i>$1</i>')
        .replace(/\n\n/gim, '<br><br>')
        .replace(/\n/gim, '<br>');

    // Wrap <li> sequences in <ul>
    html = html.replace(/(<li>.*<\/li>)/gim, '<ul>$1</ul>');
    html = html.replace(/<\/ul><ul>/gim, '');

    // Robust timestamp regex matching 1:23, 12:34, 1:23:45
    const regex = /\b(\d{1,2}:\d{2}(?::\d{2})?)\b/g;
    html = html.replace(regex, (match) => {
        return `<span class="yt-summarizer-timestamp" data-time="${match}">${match}</span>`;
    });

    content.innerHTML = `<div class="yt-summarizer-summary">${html}</div>`;
}

function seekVideo(timeStr) {
    const parts = timeStr.split(':').map(Number);
    let seconds = 0;
    if (parts.length === 3) {
        seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
        seconds = parts[0] * 60 + parts[1];
    }

    const video = document.querySelector('video');
    if (video) {
        video.currentTime = seconds;
        video.play();
    }
}

function ensurePanelExists() {
    if (summaryPanel) return;

    summaryPanel = document.createElement('div');
    summaryPanel.className = 'yt-summarizer-panel';
    summaryPanel.innerHTML = `
        <div class="yt-summarizer-header">
            <h2>YT Summary</h2>
            <button class="yt-summarizer-close">&times;</button>
        </div>
        <div class="yt-summarizer-content"></div>
    `;

    document.body.appendChild(summaryPanel);

    // Add event delegation for timestamps in the panel
    summaryPanel.addEventListener('click', (e) => {
        if (e.target.classList.contains('yt-summarizer-timestamp')) {
            seekVideo(e.target.dataset.time);
        }
    });

    summaryPanel.querySelector('.yt-summarizer-close').onclick = closePanel;
}

function openPanel() {
    summaryPanel.classList.add('open');
}

function closePanel() {
    if (summaryPanel) {
        summaryPanel.classList.remove('open');
    }
}
