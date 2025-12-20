const providerSelect = document.getElementById('provider');
const modelSelect = document.getElementById('model');
const saveButton = document.getElementById('save');
const statusDiv = document.getElementById('status');

const BACKEND_URL = 'http://localhost:8000';

// Load saved settings
chrome.storage.sync.get(['provider', 'model'], (items) => {
    if (items.provider) {
        providerSelect.value = items.provider;
    }
    fetchModels(providerSelect.value, items.model);
});

providerSelect.addEventListener('change', () => {
    fetchModels(providerSelect.value);
});

async function fetchModels(provider, savedModel = null) {
    modelSelect.innerHTML = '<option value="">Loading...</option>';
    try {
        const response = await fetch(`${BACKEND_URL}/api/models/${provider}`);
        if (!response.ok) throw new Error('Failed to fetch models');

        const data = await response.json();
        const models = data.models || [];

        modelSelect.innerHTML = '';
        if (models.length === 0) {
            modelSelect.innerHTML = '<option value="">No models found</option>';
        } else {
            models.forEach(model => {
                const option = document.createElement('option');
                option.value = model;
                option.textContent = model;
                if (savedModel === model) option.selected = true;
                modelSelect.appendChild(option);
            });

            if (!savedModel && provider === 'gemini') {
                const preferred = models.find(m => m.includes('2.5-flash'));
                if (preferred) modelSelect.value = preferred;
            }
        }
    } catch (err) {
        console.error(err);
        modelSelect.innerHTML = '<option value="">Error loading models</option>';
    }
}

saveButton.addEventListener('click', () => {
    const provider = providerSelect.value;
    const model = modelSelect.value;

    chrome.storage.sync.set({ provider, model }, () => {
        statusDiv.style.display = 'block';
        setTimeout(() => {
            statusDiv.style.display = 'none';
            window.close();
        }, 1500);
    });
});
