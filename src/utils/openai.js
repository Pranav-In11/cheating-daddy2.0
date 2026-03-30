const { OpenAI } = require('openai');
const { ipcMain } = require('electron');
const storage = require('../storage');

let openaiClient = null;

// This helper ensures we always have the latest API key from your settings
function getOpenAIClient() {
    const apiKey = storage.getApiKey();
    if (!apiKey) return null;
    
    if (!openaiClient || openaiClient.apiKey !== apiKey) {
        openaiClient = new OpenAI({ apiKey: apiKey });
    }
    return openaiClient;
}

function setupOpenAIIpcHandlers(sessionRef) {
    // This is the main "Ask AI" function
    ipcMain.handle('gemini:chat', async (event, { text, imageBase64 }) => {
        const client = getOpenAIClient();
        if (!client) return { success: false, error: "No API Key found. Please add your OpenAI key in settings." };

        try {
            const response = await client.chat.completions.create({
                model: "gpt-4o-mini", // Best balance of speed and cost
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: text || "Analyze this screen and help me." },
                            {
                                type: "image_url",
                                image_url: {
                                    url: `data:image/jpeg;base64,${imageBase64}`,
                                    detail: "low" // Faster and uses fewer tokens
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 500
            });

            return { success: true, data: response.choices[0].message.content };
        } catch (error) {
            console.error("OpenAI Error:", error);
            return { success: false, error: error.message };
        }
    });
}

function stopMacOSAudioCapture() { /* Placeholder for compatibility */ }
function sendToRenderer(window, channel, data) { if (window) window.webContents.send(channel, data); }

module.exports = {
    setupOpenAIIpcHandlers,
    stopMacOSAudioCapture,
    sendToRenderer
};
