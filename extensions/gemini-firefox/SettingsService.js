globalThis.SettingsService = class SettingsService {
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
