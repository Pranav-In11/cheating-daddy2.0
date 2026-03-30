const { OpenAI } = require('openai');
const { ipcMain } = require('electron');
const storage = require('../storage');

let openaiClient = null;

function getOpenAIClient() {
    const apiKey = storage.getApiKey();
    if (!apiKey) return null;
    
    // Refresh client if key changes
    if (!openaiClient || openaiClient.apiKey !== apiKey) {
        openaiClient = new OpenAI({ apiKey: apiKey });
    }
    return openaiClient;
}

function setupOpenAIIpcHandlers(sessionRef) {
    // This handles the main AI request loop
    ipcMain.handle('gemini:chat', async (event, { text, imageBase64, history = [] }) => {
        const client = getOpenAIClient();
        if (!client) return { success: false, error: "No API Key found. Check Settings." };

        try {
            const response = await client.chat.completions.create({
                model: "gpt-4o-mini", // Fastest and most cost-effective
                messages: [
                    { 
                        role: "system", 
                        content: "You are a concise assistant. Use the image for context. If technical diagrams are shown, be precise. If code is shown, provide only the fix or the next step." 
                    },
                    ...history.slice(-4), // Sends last 4 messages for context memory
                    {
                        role: "user",
                        content: [
                            { type: "text", text: text || "Analyze this screen." },
                            {
                                type: "image_url",
                                image_url: {
                                    url: `data:image/jpeg;base64,${imageBase64}`,
                                    detail: "low" // 'low' is faster and cheaper for text/UI
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 500
            });

            return { success: true, data: response.choices[0].message.content };
        } catch (error) {
            console.error("OpenAI API Error:", error);
            return { success: false, error: error.message };
        }
    });
}

function stopMacOSAudioCapture() {} // Compatibility stub
function sendToRenderer(window, channel, data) { 
    if (window && !window.isDestroyed()) window.webContents.send(channel, data); 
}

module.exports = { setupOpenAIIpcHandlers, stopMacOSAudioCapture, sendToRenderer };
