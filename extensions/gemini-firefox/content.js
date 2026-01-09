let summaryPanel = null;
let reOpenTab = null;
let currentSummary = null;
let lastVideoId = null;

// Observe URL changes
let lastUrl = location.href;
new MutationObserver(() => {
    if (location.href !== lastUrl) {
        lastUrl = location.href;
        onUrlChange();
    }
    // Try to inject button if removed
    injectButton();
}).observe(document.body, { childList: true, subtree: true });

function onUrlChange() {
    const videoId = new URLSearchParams(window.location.search).get('v');
    if (videoId !== lastVideoId) {
        // New video, reset state
        lastVideoId = videoId;
        currentSummary = null;
        if (summaryPanel) {
            summaryPanel.remove();
            summaryPanel = null;
        }
        if (reOpenTab) {
            reOpenTab.style.display = 'none';
        }
    }
}

function injectButton() {
    const query = '#top-level-buttons-computed, #top-level-buttons';
    const container = document.querySelector(query);

    if (container && !document.getElementById('yt-gemini-summarizer-btn')) {
        const btn = document.createElement('button');
        btn.id = 'yt-gemini-summarizer-btn';
        btn.className = 'yt-gemini-btn';
        btn.innerHTML = '✨ Summarize';
        btn.onclick = startSummarization;
        container.appendChild(btn);
    }
}

async function startSummarization() {
    const videoId = new URLSearchParams(window.location.search).get('v');
    if (!videoId) return;

    // Check API Key
    const apiKey = await SettingsService.getApiKey();
    if (!apiKey) {
        alert("Please set your Gemini API Key in the extension settings.");
        return;
    }
    const model = await SettingsService.getModel();

    ensurePanelExists();
    showPanel();

    if (currentSummary && summaryPanel.querySelector('.yt-gemini-summary')) {
        return;
    }

    const content = summaryPanel.querySelector('.yt-gemini-content');
    content.innerHTML = '<div class="yt-gemini-status">Fetching transcript...</div>';

    try {
        const transcript = await TranscriptService.getTranscript(videoId, apiKey);

        content.innerHTML = '<div class="yt-gemini-status">Generating summary with Gemini...</div>';

        // Send to background
        chrome.runtime.sendMessage({
            action: 'summarize',
            apiKey: apiKey,
            model: model,
            text: transcript
        }, (response) => {
            if (response.error) {
                content.innerHTML = `<div class="yt-gemini-error">Error: ${response.error}</div>`;
            } else {
                currentSummary = response.summary;
                renderSummary(response.summary);
            }
        });

    } catch (e) {
        content.innerHTML = `<div class="yt-gemini-error">Error: ${e.message}</div>`;
    }
}

function renderSummary(markdown) {
    const content = summaryPanel.querySelector('.yt-gemini-content');

    // Simple Markdown Rendering
    let html = markdown
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(/^\s*[\-\*] (.*$)/gim, '<li>$1</li>')
        .replace(/\*\*(.*)\*\*/gim, '<b>$1</b>')
        .replace(/\*(.*)\*/gim, '<i>$1</i>')
        .replace(/\n\n/gim, '<br><br>')
        .replace(/\n/gim, '<br>');

    html = html.replace(/(<li>.*<\/li>)/gim, '<ul>$1</ul>');
    html = html.replace(/<\/ul><ul>/gim, '');

    // Timestamps
    const regex = /\b(\d{1,2}:\d{2}(?::\d{2})?)\b/g;
    html = html.replace(regex, (match) => {
        return `<span class="yt-gemini-timestamp" data-time="${match}">${match}</span>`;
    });

    content.innerHTML = `<div class="yt-gemini-summary">${html}</div>`;
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
    summaryPanel.className = 'yt-gemini-panel';
    summaryPanel.innerHTML = `
        <div class="yt-gemini-header">
            <h2>Gemini Summary</h2>
            <button class="yt-gemini-close">&times;</button>
        </div>
        <div class="yt-gemini-content"></div>
    `;

    document.body.appendChild(summaryPanel);

    summaryPanel.querySelector('.yt-gemini-close').onclick = hidePanel;

    summaryPanel.addEventListener('click', (e) => {
        if (e.target.classList.contains('yt-gemini-timestamp')) {
            seekVideo(e.target.dataset.time);
        }
    });

    // Create Re-open Tab
    if (!reOpenTab) {
        reOpenTab = document.createElement('div');
        reOpenTab.className = 'yt-gemini-reopen';
        reOpenTab.innerHTML = '<span>Summary</span>';
        reOpenTab.title = 'Show Summary';
        reOpenTab.onclick = showPanel;
        document.body.appendChild(reOpenTab);
    }
}

function showPanel() {
    if (summaryPanel) {
        summaryPanel.classList.add('open');
        if (reOpenTab) reOpenTab.classList.remove('visible');
    }
}

function hidePanel() {
    if (summaryPanel) {
        summaryPanel.classList.remove('open');
        if (reOpenTab) reOpenTab.classList.add('visible');
    }
}
