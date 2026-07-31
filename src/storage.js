const fs = require('fs');
const path = require('path');

const DEFAULT_SETTINGS = {
  apiKey: '',
  voiceId: '',
  voiceName: '',
  speed: 1.0,
  outputDeviceId: 'default',
  textSize: 'large',
  highContrast: false,
  alwaysOnTop: true,
  hotkey: 'CommandOrControl+Shift+Space'
};

let paths = null;

function init(userDataDir, seedDir) {
  paths = {
    settings: path.join(userDataDir, 'settings.json'),
    phrases: path.join(userDataDir, 'phrases.json'),
    history: path.join(userDataDir, 'history.json'),
    seedPhrases: path.join(seedDir, 'phrases.json')
  };

  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
  }
  if (!fs.existsSync(paths.settings)) {
    writeJson(paths.settings, DEFAULT_SETTINGS);
  }
  if (!fs.existsSync(paths.phrases)) {
    const seed = readJson(paths.seedPhrases, []);
    writeJson(paths.phrases, seed);
  }
  if (!fs.existsSync(paths.history)) {
    writeJson(paths.history, []);
  }
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    return fallback;
  }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function getSettings() {
  return { ...DEFAULT_SETTINGS, ...readJson(paths.settings, {}) };
}

function setSettings(partial) {
  const merged = { ...getSettings(), ...partial };
  writeJson(paths.settings, merged);
  return merged;
}

function getPhrases() {
  return readJson(paths.phrases, []);
}

function setPhrases(list) {
  writeJson(paths.phrases, list);
  return list;
}

function getHistory() {
  return readJson(paths.history, []);
}

function addHistoryEntry(entry) {
  const history = getHistory();
  history.unshift(entry);
  const trimmed = history.slice(0, 200);
  writeJson(paths.history, trimmed);
  return trimmed;
}

function clearHistory() {
  writeJson(paths.history, []);
  return [];
}

module.exports = {
  init,
  getSettings,
  setSettings,
  getPhrases,
  setPhrases,
  getHistory,
  addHistoryEntry,
  clearHistory
};
