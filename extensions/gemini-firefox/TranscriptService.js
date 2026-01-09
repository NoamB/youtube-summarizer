globalThis.TranscriptService = class TranscriptService {
    static async getTranscript(videoId, apiKey) {
        try {
            console.log("TranscriptService: Starting for video", videoId);

            // 1. Try DOM (Fastest, but often fails with empty body on recent YouTube updates)
            if (document && document.documentElement) {
                const domTracks = this.extractCaptionTracks(document.documentElement.outerHTML);
                if (domTracks && domTracks.length > 0) {
                    console.log("Found tracks in DOM, trying them...");
                    try {
                        return await this.tryFetchAnyTrack(domTracks);
                    } catch (e) {
                        console.warn("DOM tracks failed to fetch content:", e);
                        // Fall through to API
                    }
                }
            }

            // 2. Fallback: Android API (Robust)
            if (apiKey) {
                console.log("Falling back to Android API with provided key...");
                const apiTracks = await this.fetchCaptionTracksViaApi(videoId, apiKey);
                if (apiTracks && apiTracks.length > 0) {
                    return await this.tryFetchAnyTrack(apiTracks);
                }
            } else {
                console.warn("No API Key provided for fallback.");
            }

            throw new Error("No captions found (DOM failed and API returned none).");

        } catch (error) {
            console.error("TranscriptService Error:", error);
            throw error;
        }
    }

    static async fetchCaptionTracksViaApi(videoId, apiKey) {
        const url = `https://www.youtube.com/youtubei/v1/player?key=${apiKey}`;
        const payload = {
            context: {
                client: {
                    clientName: "ANDROID",
                    clientVersion: "20.10.38"
                }
            },
            videoId: videoId
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });
            if (!response.ok) return null;
            const data = await response.json();
            return data?.captions?.playerCaptionsTracklistRenderer?.captionTracks || null;
        } catch (e) {
            console.error(e);
            return null;
        }
    }

    static async tryFetchAnyTrack(captionTracks) {
        // Prioritize English
        const englishTracks = captionTracks.filter(t => t.languageCode === 'en' || t.languageCode.startsWith('en-'));
        const otherTracks = captionTracks.filter(t => !t.languageCode.startsWith('en'));

        const sortTracks = (tracks) => {
            return tracks.sort((a, b) => { // Manual first
                const aIsAsr = (a.kind === 'asr');
                const bIsAsr = (b.kind === 'asr');
                if (aIsAsr && !bIsAsr) return 1;
                if (!aIsAsr && bIsAsr) return -1;
                return 0;
            });
        };

        const candidates = [...sortTracks(englishTracks), ...otherTracks];
        let logs = [];

        for (const track of candidates) {
            // Try 1: Credentials Include
            try {
                const transcript = await this.fetchTrackContent(track.baseUrl, 'include');
                return transcript;
            } catch (e) {
                logs.push(`[${track.languageCode}] Include: ${e.message}`);
            }

            // Try 2: Force JSON3 (Credentials Include)
            if (!track.baseUrl.includes('fmt=json3')) {
                try {
                    let jsonUrl = track.baseUrl;
                    if (jsonUrl.includes('fmt=')) jsonUrl = jsonUrl.replace(/fmt=\w+/, 'fmt=json3');
                    else jsonUrl += '&fmt=json3';

                    const transcript = await this.fetchTrackContent(jsonUrl, 'include');
                    return transcript;
                } catch (e) {
                    logs.push(`[${track.languageCode}] JSON/Inc: ${e.message}`);
                }
            }

            // Try 3: Credentials Omit
            try {
                const transcript = await this.fetchTrackContent(track.baseUrl, 'omit');
                return transcript;
            } catch (e) {
                logs.push(`[${track.languageCode}] Omit: ${e.message}`);
            }
        }

        throw new Error("Failed to fetch transcript. Details:\n" + logs.join("\n"));
    }

    static async fetchTrackContent(url, credentialsMode) {
        const response = await fetch(url, { credentials: credentialsMode });
        if (!response.ok) throw new Error(`Status ${response.status}`);

        const body = await response.text();
        if (!body || body.trim().length === 0) throw new Error("Empty Body");

        if (body.startsWith('<')) {
            return this.parseTranscriptXml(body);
        } else if (body.startsWith('{')) {
            return this.parseTranscriptJson(body);
        }
        // If it looks like text but not XML/JSON, maybe it is just raw text?
        // But for safety, let's treat unknown as error unless it's very clearly text
        throw new Error("Unknown Format (Not XML/JSON)");
    }

    static extractCaptionTracks(html) {
        try {
            const playerResponseRegex = /var\s+ytInitialPlayerResponse\s*=\s*({.+?});/s;
            const match = playerResponseRegex.exec(html);
            if (match && match[1]) {
                const playerResponse = JSON.parse(match[1]);
                if (playerResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks) {
                    return playerResponse.captions.playerCaptionsTracklistRenderer.captionTracks;
                }
            }
        } catch (e) { console.error(e); }
        return null;
    }

    static parseTranscriptJson(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (data.events) {
                let transcript = "";
                for (const event of data.events) {
                    if (event.segs && event.segs.length > 0) {
                        const startTime = event.tStartMs / 1000;
                        const timeStr = this.formatTime(startTime);
                        let segmentText = "";
                        for (const seg of event.segs) {
                            if (seg.utf8 && seg.utf8 !== '\n') segmentText += seg.utf8;
                        }
                        if (segmentText.trim().length > 0) {
                            transcript += `[${timeStr}] ${segmentText} `;
                        }
                    }
                }
                return transcript.trim();
            }
            return "";
        } catch (e) { return ""; }
    }

    static parseTranscriptXml(xmlString) {
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlString, "text/xml");
            let transcript = "";

            // Handle standard XML <text> tags
            const textNodes = xmlDoc.getElementsByTagName("text");
            if (textNodes.length > 0) {
                for (let i = 0; i < textNodes.length; i++) {
                    const node = textNodes[i];
                    const start = parseFloat(node.getAttribute("start") || "0");
                    const timeStr = this.formatTime(start);
                    const text = node.textContent;
                    if (text.trim().length > 0) {
                        transcript += `[${timeStr}] ${text} `;
                    }
                }
                return transcript.trim();
            }

            // Handle SRV3 format <p> tags
            const pNodes = xmlDoc.getElementsByTagName("p");
            if (pNodes.length > 0) {
                for (let i = 0; i < pNodes.length; i++) {
                    const node = pNodes[i];
                    const t = parseInt(node.getAttribute("t") || "0");
                    const timeStr = this.formatTime(t / 1000);
                    const text = node.textContent;
                    if (text.trim().length > 0) {
                        transcript += `[${timeStr}] ${text} `;
                    }
                }
                return transcript.trim();
            }

            return "";
        } catch (e) { return ""; }
    }

    static formatTime(seconds) {
        const min = Math.floor(seconds / 60);
        const sec = Math.floor(seconds % 60);
        return `${min}:${sec.toString().padStart(2, '0')}`;
    }
}
