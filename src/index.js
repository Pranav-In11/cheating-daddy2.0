if (require('electron-squirrel-startup')) {
    process.exit(0);
}

const { app, BrowserWindow, shell, ipcMain } = require('electron');
const { createWindow, updateGlobalShortcuts } = require('./utils/window');
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

    // Permissions for macOS
    if (process.platform === 'darwin') {
        const { desktopCapturer } = require('electron');
        desktopCapturer.getSources({ types: ['screen'] }).catch(() => {});
    }

    createMainWindow();
    setupOpenAIIpcHandlers(aiSessionRef);
    setupStorageIpcHandlers();
    setupGeneralIpcHandlers();
});

app.on('window-all-closed', () => {
    stopMacOSAudioCapture();
    if (process.platform !== 'darwin') app.quit();
});

function setupStorageIpcHandlers() {
    ipcMain.handle('storage:get-api-key', async () => ({ success: true, data: storage.getApiKey() }));
    ipcMain.handle('storage:set-api-key', async (event, apiKey) => {
        storage.setApiKey(apiKey);
        return { success: true };
    });
    // Standard preference handlers
    ipcMain.handle('storage:get-preferences', async () => ({ success: true, data: storage.getPreferences() }));
    ipcMain.handle('storage:get-config', async () => ({ success: true, data: storage.getConfig() }));
    ipcMain.handle('storage:update-preference', async (e, k, v) => {
        storage.updatePreference(k, v);
        return { success: true };
    });
}

function setupGeneralIpcHandlers() {
    ipcMain.handle('get-app-version', async () => app.getVersion());
    ipcMain.handle('quit-application', async () => { app.quit(); return { success: true }; });
    ipcMain.handle('open-external', async (event, url) => { await shell.openExternal(url); return { success: true }; });
    
    ipcMain.on('update-keybinds', (event, newKeybinds) => {
        if (mainWindow) {
            storage.setKeybinds(newKeybinds);
            updateGlobalShortcuts(newKeybinds, mainWindow, sendToRenderer, aiSessionRef);
        }
    });
}
