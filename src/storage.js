const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_VERSION = 1;
const DEFAULT_CONFIG = { configVersion: CONFIG_VERSION, onboarded: false, layout: 'normal' };
const DEFAULT_CREDENTIALS = { apiKey: '' };
const DEFAULT_PREFERENCES = {
    customPrompt: '',
    selectedProfile: 'interview',
    selectedLanguage: 'en-US',
    selectedScreenshotInterval: '5',
    selectedImageQuality: 'medium',
    fontSize: 'medium',
    backgroundTransparency: 0.8
};

function getConfigDir() {
    const platform = os.platform();
    if (platform === 'win32') return path.join(os.homedir(), 'AppData', 'Roaming', 'cheating-daddy-config');
    if (platform === 'darwin') return path.join(os.homedir(), 'Library', 'Application Support', 'cheating-daddy-config');
    return path.join(os.homedir(), '.config', 'cheating-daddy-config');
}

const getFilePath = (name) => path.join(getConfigDir(), `${name}.json`);
const getHistoryDir = () => path.join(getConfigDir(), 'history');

function readJsonFile(path, def) {
    try { return fs.existsSync(path) ? JSON.parse(fs.readFileSync(path, 'utf8')) : def; }
    catch { return def; }
}

function writeJsonFile(path, data) {
    const dir = path.dirname(path);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = {
    initializeStorage: () => {
        const dir = getConfigDir();
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        if (!fs.existsSync(getHistoryDir())) fs.mkdirSync(getHistoryDir(), { recursive: true });
    },
    getConfig: () => readJsonFile(getFilePath('config'), DEFAULT_CONFIG),
    getApiKey: () => readJsonFile(getFilePath('credentials'), DEFAULT_CREDENTIALS).apiKey,
    setApiKey: (apiKey) => writeJsonFile(getFilePath('credentials'), { apiKey }),
    getPreferences: () => readJsonFile(getFilePath('preferences'), DEFAULT_PREFERENCES),
    updatePreference: (key, value) => {
        const p = readJsonFile(getFilePath('preferences'), DEFAULT_PREFERENCES);
        p[key] = value;
        writeJsonFile(getFilePath('preferences'), p);
    },
    getKeybinds: () => readJsonFile(getFilePath('keybinds'), null),
    setKeybinds: (k) => writeJsonFile(getFilePath('keybinds'), k),
    // Compatibility stubs
    getTodayLimits: () => ({}),
    saveSession: () => {},
    getAllSessions: () => []
};
