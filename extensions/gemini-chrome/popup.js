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
