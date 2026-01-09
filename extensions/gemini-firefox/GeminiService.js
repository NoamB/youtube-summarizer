globalThis.GeminiService = class GeminiService {
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
