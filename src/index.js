if (require('electron-squirrel-startup')) {
    process.exit(0);
}

const { app, BrowserWindow, shell, ipcMain } = require('electron');
const { createWindow, updateGlobalShortcuts } = require('./utils/window');
// We change the import to our new openai utility
const { setupOpenAIIpcHandlers, stopMacOSAudioCapture, sendToRenderer } = require('./utils/openai');
const storage = require('./storage');

const aiSessionRef = { current: null };
let mainWindow = null;

function createMainWindow() {
    mainWindow = createWindow(sendToRenderer, aiSessionRef);
    return mainWindow;
}

app.whenReady().then(async () => {
    storage.initializeStorage();

    if (process.platform === 'darwin') {
        const { desktopCapturer } = require('electron');
        desktopCapturer.getSources({ types: ['screen'] }).catch(() => {});
    }

    createMainWindow();
    // Initialize the OpenAI Handlers
    setupOpenAIIpcHandlers(aiSessionRef);
    setupStorageIpcHandlers();
    setupGeneralIpcHandlers();
});

app.on('window-all-closed', () => {
    stopMacOSAudioCapture();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    stopMacOSAudioCapture();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
    }
});

function setupStorageIpcHandlers() {
    ipcMain.handle('storage:get-api-key', async () => {
        try {
            return { success: true, data: storage.getApiKey() };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:set-api-key', async (event, apiKey) => {
        try {
            storage.setApiKey(apiKey);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });
    
    // Standard storage handlers for preferences and sessions
    ipcMain.handle('storage:get-preferences', async () => ({ success: true, data: storage.getPreferences() }));
    ipcMain.handle('storage:get-config', async () => ({ success: true, data: storage.getConfig() }));
}

function setupGeneralIpcHandlers() {
    ipcMain.handle('get-app-version', async () => app.getVersion());
    ipcMain.handle('quit-application', async () => { app.quit(); return { success: true }; });
    ipcMain.handle('open-external', async (event, url) => { await shell.openExternal(url); return { success: true }; });
}
