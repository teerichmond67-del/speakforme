const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('speakforme', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (partial) => ipcRenderer.invoke('settings:set', partial),

  getPhrases: () => ipcRenderer.invoke('phrases:get'),
  setPhrases: (list) => ipcRenderer.invoke('phrases:set', list),

  getHistory: () => ipcRenderer.invoke('history:get'),
  clearHistory: () => ipcRenderer.invoke('history:clear'),

  speak: (text, speed) => ipcRenderer.invoke('tts:speak', { text, speed }),
  listVoices: (apiKey) => ipcRenderer.invoke('tts:list-voices', apiKey),

  onFocusSpeakBar: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('focus-speak-bar', listener);
    return () => ipcRenderer.removeListener('focus-speak-bar', listener);
  }
});
