const { app, BrowserWindow, ipcMain, globalShortcut, Menu } = require('electron');
const path = require('path');
const { randomUUID } = require('crypto');
const storage = require('./src/storage');
const tts = require('./src/tts');

let mainWindow = null;

function createWindow() {
  const settings = storage.getSettings();

  mainWindow = new BrowserWindow({
    width: 900,
    height: 720,
    minWidth: 640,
    minHeight: 520,
    alwaysOnTop: settings.alwaysOnTop,
    title: 'SpeakForMe',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  Menu.setApplicationMenu(null);
  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
}

function registerHotkey(accelerator) {
  globalShortcut.unregisterAll();
  if (!accelerator) return;
  try {
    globalShortcut.register(accelerator, () => {
      if (!mainWindow) return;
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
      mainWindow.webContents.send('focus-speak-bar');
    });
  } catch (err) {
    console.error('Failed to register global hotkey', accelerator, err);
  }
}

app.whenReady().then(() => {
  storage.init(app.getPath('userData'), path.join(__dirname, 'data'));
  createWindow();
  registerHotkey(storage.getSettings().hotkey);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// ---- IPC: settings ----
ipcMain.handle('settings:get', () => storage.getSettings());

ipcMain.handle('settings:set', (event, partial) => {
  const previousHotkey = storage.getSettings().hotkey;
  const updated = storage.setSettings(partial);

  if (mainWindow) {
    if (typeof partial.alwaysOnTop === 'boolean') {
      mainWindow.setAlwaysOnTop(partial.alwaysOnTop);
    }
  }
  if (partial.hotkey && partial.hotkey !== previousHotkey) {
    registerHotkey(updated.hotkey);
  }
  return updated;
});

// ---- IPC: phrases ----
ipcMain.handle('phrases:get', () => storage.getPhrases());
ipcMain.handle('phrases:set', (event, list) => storage.setPhrases(list));

// ---- IPC: history ----
ipcMain.handle('history:get', () => storage.getHistory());
ipcMain.handle('history:clear', () => storage.clearHistory());

// Mood support: non-neutral moods route through ElevenLabs' eleven_v3 model
// using inline audio tags for emotional delivery. Neutral (the default)
// stays on the fast turbo model used everywhere else. The OS fallback and
// history log always use the plain, untagged text.
const MOOD_TAGS = {
  happy: '[cheerfully]',
  sad: '[sorrowful]',
  angry: '[frustrated]',
  excited: '[excited]'
};

// ---- IPC: text-to-speech ----
ipcMain.handle('tts:speak', async (event, { text, speed, mood }) => {
  const settings = storage.getSettings();
  const trimmed = String(text || '').trim();
  if (!trimmed) return { ok: false, error: 'Empty text' };

  const effectiveSpeed = speed ?? settings.speed;
  const moodTag = MOOD_TAGS[mood];
  const modelId = moodTag ? 'eleven_v3' : 'eleven_turbo_v2_5';
  const ttsText = moodTag ? `${moodTag} ${trimmed}` : trimmed;
  let result;

  try {
    const buffer = await tts.speakElevenLabs({
      text: ttsText,
      apiKey: settings.apiKey,
      voiceId: settings.voiceId,
      speed: effectiveSpeed,
      modelId
    });
    result = { ok: true, mode: 'elevenlabs', audio: buffer.toString('base64') };
  } catch (err) {
    console.error('ElevenLabs TTS failed, falling back to OS voice:', err.message);
    try {
      await tts.speakOSFallback(trimmed, effectiveSpeed);
      result = { ok: true, mode: 'os-fallback' };
    } catch (fallbackErr) {
      console.error('OS TTS fallback failed:', fallbackErr.message);
      return { ok: false, error: fallbackErr.message };
    }
  }

  storage.addHistoryEntry({
    id: randomUUID(),
    text: trimmed,
    mode: result.mode,
    timestamp: new Date().toISOString()
  });

  return result;
});

ipcMain.handle('tts:list-voices', async (event, apiKey) => {
  const key = apiKey || storage.getSettings().apiKey;
  return tts.listVoices(key);
});

ipcMain.handle('tts:add-voice', async (event, { name, description, samples }) => {
  const key = storage.getSettings().apiKey;
  return tts.addVoice({ apiKey: key, name, description, samples });
});
