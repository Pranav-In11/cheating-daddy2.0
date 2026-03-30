const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_VERSION = 1;

// Default values
const DEFAULT_CONFIG = {
    configVersion: CONFIG_VERSION,
    onboarded: false,
    layout: 'normal'
};

const DEFAULT_CREDENTIALS = {
    apiKey: '', // This will now store your OpenAI Key
};

const DEFAULT_PREFERENCES = {
    customPrompt: '',
    selectedProfile: 'interview',
    selectedLanguage: 'en-US',
    selectedScreenshotInterval: '5',
    selectedImageQuality: 'medium',
    advancedMode: false,
    audioMode: 'speaker_only',
    fontSize: 'medium',
    backgroundTransparency: 0.8,
    googleSearchEnabled: false,
    ollamaHost: 'http://127.0.0.1:11434',
    ollamaModel: 'llama3.1',
    whisperModel: 'Xenova/whisper-small',
};

const DEFAULT_KEYBINDS = null; 

const DEFAULT_LIMITS = {
    data: [] 
};

// Get the config directory path based on OS
function getConfigDir() {
    const platform = os.platform();
    let configDir;

    if (platform === 'win32') {
        configDir = path.join(os.homedir(), 'AppData', 'Roaming', 'cheating-daddy-config');
    } else if (platform === 'darwin') {
        configDir = path.join(os.homedir(), 'Library', 'Application Support', 'cheating-daddy-config');
    } else {
        configDir = path.join(os.homedir(), '.config', 'cheating-daddy-config');
    }

    return configDir;
}

// File paths
const getConfigPath = () => path.join(getConfigDir(), 'config.json');
const getCredentialsPath = () => path.join(getConfigDir(), 'credentials.json');
const getPreferencesPath = () => path.join(getConfigDir(), 'preferences.json');
const getKeybindsPath = () => path.join(getConfigDir(), 'keybinds.json');
const getLimitsPath = () => path.join(getConfigDir(), 'limits.json');
const getHistoryDir = () => path.join(getConfigDir(), 'history');

// Helper to read JSON file safely
function readJsonFile(filePath, defaultValue) {
    try {
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.warn(`Error reading ${filePath}:`, error.message);
    }
    return defaultValue;
}

// Helper to write JSON file safely
function writeJsonFile(filePath, data) {
    try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error(`Error writing ${filePath}:`, error.message);
        return false;
    }
}

function needsReset() {
    const configPath = getConfigPath();
    if (!fs.existsSync(configPath)) return true;
    try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return !config.configVersion || config.configVersion !== CONFIG_VERSION;
    } catch {
        return true;
    }
}

function resetConfigDir() {
    const configDir = getConfigDir();
    if (fs.existsSync(configDir)) {
        fs.rmSync(configDir, { recursive: true, force: true });
    }
    fs.mkdirSync(configDir, { recursive: true });
    fs.mkdirSync(getHistoryDir(), { recursive: true });

    writeJsonFile(getConfigPath(), DEFAULT_CONFIG);
    writeJsonFile(getCredentialsPath(), DEFAULT_CREDENTIALS);
    writeJsonFile(getPreferencesPath(), DEFAULT_PREFERENCES);
}

function initializeStorage() {
    if (needsReset()) {
        resetConfigDir();
    } else {
        const historyDir = getHistoryDir();
        if (!fs.existsSync(historyDir)) {
            fs.mkdirSync(historyDir, { recursive: true });
        }
    }
}

// ============ CONFIG & CREDENTIALS ============

function getConfig() { return readJsonFile(getConfigPath(), DEFAULT_CONFIG); }
function setConfig(config) { return writeJsonFile(getConfigPath(), { ...getConfig(), ...config }); }

function getCredentials() { return readJsonFile(getCredentialsPath(), DEFAULT_CREDENTIALS); }
function setCredentials(credentials) { return writeJsonFile(getCredentialsPath(), { ...getCredentials(), ...credentials }); }

function getApiKey() { return getCredentials().apiKey || ''; }
function setApiKey(apiKey) { return setCredentials({ apiKey }); }

// ============ PREFERENCES ============

function getPreferences() {
    const saved = readJsonFile(getPreferencesPath(), {});
    return { ...DEFAULT_PREFERENCES, ...saved };
}

function setPreferences(preferences) {
    return writeJsonFile(getPreferencesPath(), { ...getPreferences(), ...preferences });
}

function updatePreference(key, value) {
    const preferences = getPreferences();
    preferences[key] = value;
    return writeJsonFile(getPreferencesPath(), preferences);
}

// ============ HISTORY ============

function getSessionPath(sessionId) { return path.join(getHistoryDir(), `${sessionId}.json`); }

function saveSession(sessionId, data) {
    const sessionPath = getSessionPath(sessionId);
    const existing = readJsonFile(sessionPath, null);
    const sessionData = {
        sessionId,
        createdAt: existing?.createdAt || Date.now(),
        lastUpdated: Date.now(),
        profile: data.profile || existing?.profile || null,
        conversationHistory: data.conversationHistory || existing?.conversationHistory || [],
        screenAnalysisHistory: data.screenAnalysisHistory || existing?.screenAnalysisHistory || []
    };
    return writeJsonFile(sessionPath, sessionData);
}

function getSession(sessionId) { return readJsonFile(getSessionPath(sessionId), null); }

function getAllSessions() {
    const historyDir = getHistoryDir();
    if (!fs.existsSync(historyDir)) return [];
    return fs.readdirSync(historyDir)
        .filter(f => f.endsWith('.json'))
        .map(file => readJsonFile(path.join(historyDir, file), null))
        .filter(Boolean)
        .sort((a, b) => b.lastUpdated - a.lastUpdated);
}

function deleteSession(sessionId) {
    try { fs.unlinkSync(getSessionPath(sessionId)); return true; } catch { return false; }
}

module.exports = {
    initializeStorage,
    getConfigDir,
    getConfig,
    setConfig,
    getApiKey,
    setApiKey,
    getPreferences,
    setPreferences,
    updatePreference,
    saveSession,
    getSession,
    getAllSessions,
    deleteSession,
    clearAllData: resetConfigDir,
    // Stubs for compatibility with index.js
    getTodayLimits: () => ({}),
    getKeybinds: () => readJsonFile(getKeybindsPath(), null),
    setKeybinds: (k) => writeJsonFile(getKeybindsPath(), k)
};
