// --- SettingsService ---
class SettingsService {
    static async getApiKey() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(['geminiApiKey'], (result) => {
                resolve(result.geminiApiKey);
            });
        });
    }

    static async setApiKey(key) {
        return new Promise((resolve) => {
            chrome.storage.sync.set({ geminiApiKey: key }, () => {
                resolve();
            });
        });
    }

    static async getModel() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(['geminiModel'], (result) => {
                resolve(result.geminiModel || 'gemini-2.0-flash');
            });
        });
    }

    static async setModel(model) {
        return new Promise((resolve) => {
            chrome.storage.sync.set({ geminiModel: model }, () => {
                resolve();
            });
        });
    }
}

// --- GeminiService ---
class GeminiService {
    static async listModels(apiKey) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to list models: ${response.statusText}`);
        }
        const data = await response.json();
        return data.models
            .filter(m => m.supportedGenerationMethods.includes("generateContent"))
            .map(m => m.name.replace("models/", ""));
    }

    static async summarize(apiKey, model, text) {
        if (!model) model = "gemini-2.0-flash"; // Default fallback
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const prompt = `
        You are a professional assistant that specializes in summarizing YouTube videos for busy business professionals that don't have time to watch them.
       
        A transcript will be provided below.

        Provide a summary following these guidelines:
        1. Return the summary and only the summary, without any additional text.
        2. Merge repeated points and ideas into one point.
        3. Make the text easy to read - spacious, no long blocks of text. Use indentation with titles and subtitles for easy context.
        4. Remove any promotional or self-promotional content.
        5. Use markdown to format the text.
        6. Keep it short(not more than 500 words, 300 words is preferred) and to the point but don't miss any important insights and messages the speaker is trying to convey.

        Start with a short paragraph summarizing the key messages in the video in 3-5 bullets.
        Then provide a summary of key messages by section, providing timestamps for each section.

        Here is the transcript of the video:
        
        "${text}"
        `;

        // Configure permissive safety settings
        const safetySettings = [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" }
        ];

        const payload = {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }],
            safetySettings: safetySettings
        };

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error?.message || `Gemini API Error: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("Gemini API Response:", JSON.stringify(data, null, 2));

        if (!data.candidates || data.candidates.length === 0) {
            // Check if there's a promptFeedback with block reason
            if (data.promptFeedback && data.promptFeedback.blockReason) {
                throw new Error(`Request blocked: ${data.promptFeedback.blockReason}`);
            }
            throw new Error("No candidates returned from Gemini.");
        }

        const candidate = data.candidates[0];

        if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
            return candidate.content.parts[0].text;
        } else {
            console.error("Candidate missing content:", JSON.stringify(candidate));
            // Check finishReason
            if (candidate.finishReason) {
                throw new Error(`Generation returned no text. Finish Reason: ${candidate.finishReason}. Raw candidate: ${JSON.stringify(candidate)}`);
            }
            throw new Error("No response content from Gemini (unknown reason).");
        }
    }
}

// --- Popup Logic ---
document.addEventListener('DOMContentLoaded', async function () {
    const apiKeyInput = document.getElementById('apiKey');
    const modelSelect = document.getElementById('model');
    const saveBtn = document.getElementById('saveBtn');
    const status = document.getElementById('status');
    const loadingModels = document.getElementById('loadingModels');

    // Load existing settings
    const currentKey = await SettingsService.getApiKey();
    if (currentKey) {
        apiKeyInput.value = currentKey;
        await fetchAndPopulateModels(currentKey);
    }

    // Set selected model after populating (or trying to)
    const currentModel = await SettingsService.getModel();
    if (currentModel) {
        // If the model exists in the list, select it. 
        // If not (and list is empty or model passed away), we might just add it or select valid one?
        // For now, let's try setting value.
        modelSelect.value = currentModel;

        // If value wasn't set (because it's not in options), we might want to add it as custom option? 
        // But user asked for dropdown "AFTER I enter my API key".
    }

    // Refresh models when API Key changes (on blur)
    apiKeyInput.addEventListener('blur', async () => {
        const key = apiKeyInput.value.trim();
        if (key && key !== currentKey) {
            await fetchAndPopulateModels(key);
        }
    });

    // Save settings
    saveBtn.addEventListener('click', async () => {
        const key = apiKeyInput.value.trim();
        const model = modelSelect.value;

        if (!key) {
            showStatus("Please enter an API Key.", "error");
            return;
        }

        if (!model) {
            showStatus("Please select a model.", "error");
            return;
        }

        await SettingsService.setApiKey(key);
        await SettingsService.setModel(model);

        showStatus("Settings saved!", "success");
    });

    async function fetchAndPopulateModels(apiKey) {
        try {
            loadingModels.style.display = 'block';
            modelSelect.disabled = true;
            modelSelect.innerHTML = '<option value="" disabled selected>Loading...</option>';

            const models = await GeminiService.listModels(apiKey);

            modelSelect.innerHTML = '<option value="" disabled selected>Select a model...</option>';

            if (models.length === 0) {
                modelSelect.innerHTML = '<option value="" disabled>No models found</option>';
            } else {
                models.forEach(m => {
                    const option = document.createElement('option');
                    option.value = m;
                    option.textContent = m;
                    modelSelect.appendChild(option);
                });
            }

            // Re-select current model if available
            const savedModel = await SettingsService.getModel();
            if (savedModel && models.includes(savedModel)) {
                modelSelect.value = savedModel;
            } else if (models.length > 0) {
                // Default to first if saved invalid
                // Prefer gemini-2.0-flash or pro if available
                const strategies = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
                let bestMatch = models.find(m => strategies.some(s => m.includes(s))) || models[0];
                modelSelect.value = bestMatch;
            }

        } catch (error) {
            console.error(error);
            modelSelect.innerHTML = `<option value="" disabled>Error: ${error.message}</option>`;
        } finally {
            loadingModels.style.display = 'none';
            modelSelect.disabled = false;
        }
    }

    function showStatus(msg, type) {
        status.textContent = msg;
        status.style.color = type === 'error' ? '#ef4444' : '#22c55e';
        if (type === 'success') {
            setTimeout(() => {
                status.textContent = "";
            }, 2000);
        }
    }
});
