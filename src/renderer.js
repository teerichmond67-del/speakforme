(() => {
  const speakInput = document.getElementById('speak-input');
  const speakButton = document.getElementById('speak-button');
  const statusPill = document.getElementById('status-pill');
  const undoRow = document.getElementById('undo-row');
  const undoPreview = document.getElementById('undo-preview');
  const undoButton = document.getElementById('undo-button');

  const historyToggle = document.getElementById('history-toggle');
  const historyPanel = document.getElementById('history-panel');
  const historyList = document.getElementById('history-list');
  const clearHistoryButton = document.getElementById('clear-history');

  const settingsToggle = document.getElementById('settings-toggle');
  const settingsModal = document.getElementById('settings-modal');
  const apiKeyInput = document.getElementById('api-key-input');
  const voiceSelect = document.getElementById('voice-select');
  const loadVoicesButton = document.getElementById('load-voices');
  const customVoiceName = document.getElementById('custom-voice-name');
  const customVoiceFiles = document.getElementById('custom-voice-files');
  const customVoiceFileSummary = document.getElementById('custom-voice-file-summary');
  const addVoiceButton = document.getElementById('add-voice-button');
  const speedInput = document.getElementById('speed-input');
  const speedValue = document.getElementById('speed-value');
  const outputDeviceSelect = document.getElementById('output-device-select');
  const alwaysOnTopInput = document.getElementById('always-on-top-input');
  const highContrastInput = document.getElementById('high-contrast-input');
  const textSizeSelect = document.getElementById('text-size-select');

  const manageButton = document.getElementById('manage-phrases');
  const phrasesModal = document.getElementById('phrases-modal');
  const addPhraseForm = document.getElementById('add-phrase-form');
  const newLabelInput = document.getElementById('new-phrase-label');
  const newTextInput = document.getElementById('new-phrase-text');
  const newCategoryInput = document.getElementById('new-phrase-category');
  const phraseEditorList = document.getElementById('phrase-editor-list');

  const categoryTabs = document.getElementById('category-tabs');
  const phraseGrid = document.getElementById('phrase-grid');
  const player = document.getElementById('player');

  let settings = null;
  let phrases = [];
  let activeCategory = 'All';

  function applyAppearance() {
    document.documentElement.setAttribute('data-high-contrast', String(!!settings.highContrast));
    document.documentElement.setAttribute('data-text-size', settings.textSize || 'large');
  }

  function setStatus(state, label) {
    statusPill.dataset.state = state;
    statusPill.textContent = label;
  }

  async function init() {
    settings = await window.speakforme.getSettings();
    phrases = await window.speakforme.getPhrases();

    apiKeyInput.value = settings.apiKey || '';
    speedInput.value = settings.speed ?? 1.0;
    speedValue.textContent = `${Number(speedInput.value).toFixed(2)}x`;
    alwaysOnTopInput.checked = !!settings.alwaysOnTop;
    highContrastInput.checked = !!settings.highContrast;
    textSizeSelect.value = settings.textSize || 'large';

    applyAppearance();
    renderCategoryTabs();
    renderPhraseGrid();
    await refreshOutputDevices();
    await refreshHistory();

    speakInput.focus();
  }

  // ---- Speak bar ----
  async function speakText(text) {
    const trimmed = text.trim();
    if (!trimmed) return false;

    speakButton.disabled = true;
    setStatus('speaking', 'Speaking…');
    let success = false;

    try {
      const result = await window.speakforme.speak(trimmed, settings.speed);
      if (!result.ok) {
        setStatus('error', 'Error');
        console.error('Speak failed:', result.error);
      } else {
        if (result.mode === 'elevenlabs' && result.audio) {
          await playBase64Audio(result.audio);
        }
        setStatus('done', 'Done');
        success = true;
      }
    } catch (err) {
      setStatus('error', 'Error');
      console.error(err);
    } finally {
      speakButton.disabled = false;
      await refreshHistory();
      setTimeout(() => {
        if (statusPill.dataset.state !== 'speaking') setStatus('idle', 'Ready');
      }, 1500);
    }

    return success;
  }

  let lastClearedText = null;

  function showUndo(text) {
    lastClearedText = text;
    undoPreview.textContent = text.length > 60 ? `${text.slice(0, 60)}…` : text;
    undoRow.hidden = false;
  }

  function hideUndo() {
    undoRow.hidden = true;
    lastClearedText = null;
  }

  async function speakTypedInput() {
    const text = speakInput.value;
    const trimmed = text.trim();
    if (!trimmed) return;

    const ok = await speakText(text);
    if (ok) {
      speakInput.value = '';
      showUndo(trimmed);
    }
  }

  undoButton.addEventListener('click', () => {
    if (lastClearedText === null) return;
    speakInput.value = lastClearedText;
    hideUndo();
    speakInput.focus();
    speakInput.selectionStart = speakInput.selectionEnd = speakInput.value.length;
  });

  speakInput.addEventListener('input', () => {
    if (!undoRow.hidden) hideUndo();
  });

  async function playBase64Audio(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: 'audio/mpeg' });
    const url = URL.createObjectURL(blob);

    if (settings.outputDeviceId && settings.outputDeviceId !== 'default' && typeof player.setSinkId === 'function') {
      try {
        await player.setSinkId(settings.outputDeviceId);
      } catch (err) {
        console.warn('Could not set output device, using system default:', err);
      }
    }

    player.src = url;
    await player.play();
    await new Promise((resolve) => {
      player.onended = resolve;
      player.onerror = resolve;
    });
    URL.revokeObjectURL(url);
  }

  speakButton.addEventListener('click', () => speakTypedInput());

  speakInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      speakTypedInput();
    }
  });

  window.speakforme.onFocusSpeakBar(() => speakInput.focus());

  // ---- Quick phrases ----
  function renderCategoryTabs() {
    const categories = ['All', ...new Set(phrases.map((p) => p.category || 'Uncategorized'))];
    categoryTabs.innerHTML = '';
    categories.forEach((cat) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'category-tab' + (cat === activeCategory ? ' active' : '');
      btn.textContent = cat;
      btn.addEventListener('click', () => {
        activeCategory = cat;
        renderCategoryTabs();
        renderPhraseGrid();
      });
      categoryTabs.appendChild(btn);
    });
  }

  function renderPhraseGrid() {
    phraseGrid.innerHTML = '';
    const visible = activeCategory === 'All'
      ? phrases
      : phrases.filter((p) => (p.category || 'Uncategorized') === activeCategory);

    visible.forEach((phrase) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'phrase-button';
      btn.textContent = phrase.label || phrase.text;
      btn.title = phrase.text;
      btn.addEventListener('click', () => speakText(phrase.text));
      phraseGrid.appendChild(btn);
    });
  }

  // ---- History ----
  async function refreshHistory() {
    const history = await window.speakforme.getHistory();
    historyList.innerHTML = '';
    history.forEach((entry) => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'history-item';
      const time = document.createElement('span');
      time.className = 'history-time';
      time.textContent = new Date(entry.timestamp).toLocaleTimeString();
      const text = document.createElement('span');
      text.textContent = entry.text;
      btn.appendChild(time);
      btn.appendChild(text);
      btn.addEventListener('click', () => speakText(entry.text));
      li.appendChild(btn);
      historyList.appendChild(li);
    });
  }

  historyToggle.addEventListener('click', () => {
    historyPanel.hidden = !historyPanel.hidden;
  });

  clearHistoryButton.addEventListener('click', async () => {
    await window.speakforme.clearHistory();
    await refreshHistory();
  });

  document.querySelectorAll('.close-panel').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.getElementById(btn.dataset.panel).hidden = true;
    });
  });

  // ---- Settings ----
  settingsToggle.addEventListener('click', async () => {
    await refreshOutputDevices();
    settingsModal.hidden = false;
  });

  document.querySelectorAll('.close-modal').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.getElementById(btn.dataset.modal).hidden = true;
    });
  });

  async function saveSettings(partial) {
    settings = await window.speakforme.setSettings(partial);
    applyAppearance();
  }

  apiKeyInput.addEventListener('change', () => saveSettings({ apiKey: apiKeyInput.value.trim() }));

  speedInput.addEventListener('input', () => {
    speedValue.textContent = `${Number(speedInput.value).toFixed(2)}x`;
  });
  speedInput.addEventListener('change', () => saveSettings({ speed: Number(speedInput.value) }));

  alwaysOnTopInput.addEventListener('change', () => saveSettings({ alwaysOnTop: alwaysOnTopInput.checked }));
  highContrastInput.addEventListener('change', () => saveSettings({ highContrast: highContrastInput.checked }));
  textSizeSelect.addEventListener('change', () => saveSettings({ textSize: textSizeSelect.value }));

  async function loadVoicesList(selectVoiceId) {
    const key = apiKeyInput.value.trim();
    if (!key) {
      alert('Enter your ElevenLabs API key first.');
      return;
    }
    loadVoicesButton.disabled = true;
    loadVoicesButton.textContent = 'Loading…';
    try {
      const voices = await window.speakforme.listVoices(key);
      voiceSelect.innerHTML = '';
      const wantSelected = selectVoiceId || settings.voiceId;
      voices.forEach((v) => {
        const opt = document.createElement('option');
        opt.value = v.id;
        opt.textContent = v.name;
        if (v.id === wantSelected) opt.selected = true;
        voiceSelect.appendChild(opt);
      });
      if (selectVoiceId) {
        const opt = voiceSelect.options[voiceSelect.selectedIndex];
        if (opt) await saveSettings({ voiceId: opt.value, voiceName: opt.textContent });
      }
    } catch (err) {
      alert(`Could not load voices: ${err.message || err}`);
    } finally {
      loadVoicesButton.disabled = false;
      loadVoicesButton.textContent = 'Load voices';
    }
  }

  loadVoicesButton.addEventListener('click', () => loadVoicesList());

  voiceSelect.addEventListener('change', () => {
    const opt = voiceSelect.options[voiceSelect.selectedIndex];
    if (!opt) return;
    saveSettings({ voiceId: opt.value, voiceName: opt.textContent });
  });

  customVoiceFiles.addEventListener('change', () => {
    const files = Array.from(customVoiceFiles.files || []);
    customVoiceFileSummary.textContent = files.length
      ? `${files.length} file${files.length > 1 ? 's' : ''} selected: ${files.map((f) => f.name).join(', ')}`
      : '';
  });

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  addVoiceButton.addEventListener('click', async () => {
    const key = apiKeyInput.value.trim();
    if (!key) {
      alert('Enter your ElevenLabs API key first.');
      return;
    }
    const name = customVoiceName.value.trim();
    if (!name) {
      alert('Give your custom voice a name.');
      return;
    }
    const files = Array.from(customVoiceFiles.files || []);
    if (!files.length) {
      alert('Choose at least one audio sample of the voice.');
      return;
    }

    addVoiceButton.disabled = true;
    addVoiceButton.textContent = 'Cloning voice…';
    try {
      const samples = await Promise.all(
        files.map(async (file) => ({ filename: file.name, data: await fileToBase64(file) }))
      );
      const newVoice = await window.speakforme.addVoice(name, '', samples);
      await loadVoicesList(newVoice.id);

      customVoiceName.value = '';
      customVoiceFiles.value = '';
      customVoiceFileSummary.textContent = '';
      alert(`"${newVoice.name}" is ready and selected as your voice.`);
    } catch (err) {
      alert(`Could not create voice: ${err.message || err}`);
    } finally {
      addVoiceButton.disabled = false;
      addVoiceButton.textContent = 'Create voice from sample';
    }
  });

  async function refreshOutputDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const outputs = devices.filter((d) => d.kind === 'audiooutput');
      outputDeviceSelect.innerHTML = '';

      const defaultOpt = document.createElement('option');
      defaultOpt.value = 'default';
      defaultOpt.textContent = 'System default';
      outputDeviceSelect.appendChild(defaultOpt);

      outputs.forEach((d) => {
        const opt = document.createElement('option');
        opt.value = d.deviceId;
        opt.textContent = d.label || `Speaker (${d.deviceId.slice(0, 6)})`;
        outputDeviceSelect.appendChild(opt);
      });

      outputDeviceSelect.value = settings.outputDeviceId || 'default';
    } catch (err) {
      console.warn('Could not enumerate audio devices:', err);
    }
  }

  outputDeviceSelect.addEventListener('change', () => {
    saveSettings({ outputDeviceId: outputDeviceSelect.value });
  });

  // ---- Phrase management ----
  manageButton.addEventListener('click', () => {
    editingIndex = null;
    renderPhraseEditor();
    phrasesModal.hidden = false;
  });

  addPhraseForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const label = newLabelInput.value.trim();
    const text = newTextInput.value.trim();
    const category = newCategoryInput.value.trim() || 'Uncategorized';
    if (!label || !text) return;

    phrases.push({ id: `phrase-${Date.now()}`, label, text, category });
    await window.speakforme.setPhrases(phrases);

    newLabelInput.value = '';
    newTextInput.value = '';
    newCategoryInput.value = '';

    renderPhraseEditor();
    renderCategoryTabs();
    renderPhraseGrid();
  });

  let editingIndex = null;

  function renderPhraseEditor() {
    phraseEditorList.innerHTML = '';
    phrases.forEach((phrase, index) => {
      const li = document.createElement('li');
      li.className = 'phrase-editor-item';

      if (index === editingIndex) {
        li.classList.add('editing');

        const fields = document.createElement('div');
        fields.className = 'phrase-editor-edit-fields';

        const labelInput = document.createElement('input');
        labelInput.type = 'text';
        labelInput.value = phrase.label;
        labelInput.placeholder = 'Button label';

        const textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.value = phrase.text;
        textInput.placeholder = 'Full phrase to speak';

        const categoryInput = document.createElement('input');
        categoryInput.type = 'text';
        categoryInput.value = phrase.category || '';
        categoryInput.placeholder = 'Category';

        fields.appendChild(labelInput);
        fields.appendChild(textInput);
        fields.appendChild(categoryInput);

        const saveBtn = makeIconBtn('Save', () => {
          phrases[index] = {
            ...phrase,
            label: labelInput.value.trim() || phrase.label,
            text: textInput.value.trim() || phrase.text,
            category: categoryInput.value.trim() || 'Uncategorized'
          };
          editingIndex = null;
          persistPhrases();
        });
        const cancelBtn = makeIconBtn('Cancel', () => {
          editingIndex = null;
          renderPhraseEditor();
        });

        li.appendChild(fields);
        li.appendChild(saveBtn);
        li.appendChild(cancelBtn);
        phraseEditorList.appendChild(li);
        return;
      }

      const body = document.createElement('div');
      body.className = 'phrase-editor-text';
      const labelEl = document.createElement('span');
      labelEl.className = 'phrase-editor-label';
      labelEl.textContent = `${phrase.label} · ${phrase.category || 'Uncategorized'}`;
      const textEl = document.createElement('span');
      textEl.className = 'phrase-editor-body';
      textEl.textContent = phrase.text;
      body.appendChild(labelEl);
      body.appendChild(textEl);

      const upBtn = makeIconBtn('↑', () => movePhrase(index, -1));
      const downBtn = makeIconBtn('↓', () => movePhrase(index, 1));
      const editBtn = makeIconBtn('Edit', () => editPhrase(index));
      const deleteBtn = makeIconBtn('Delete', () => deletePhrase(index));

      li.appendChild(body);
      li.appendChild(upBtn);
      li.appendChild(downBtn);
      li.appendChild(editBtn);
      li.appendChild(deleteBtn);
      phraseEditorList.appendChild(li);
    });
  }

  function makeIconBtn(label, onClick) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = label;
    btn.addEventListener('click', onClick);
    return btn;
  }

  async function persistPhrases() {
    await window.speakforme.setPhrases(phrases);
    renderPhraseEditor();
    renderCategoryTabs();
    renderPhraseGrid();
  }

  function movePhrase(index, delta) {
    const target = index + delta;
    if (target < 0 || target >= phrases.length) return;
    [phrases[index], phrases[target]] = [phrases[target], phrases[index]];
    persistPhrases();
  }

  function editPhrase(index) {
    editingIndex = index;
    renderPhraseEditor();
  }

  function deletePhrase(index) {
    if (!confirm(`Delete "${phrases[index].label}"?`)) return;
    phrases.splice(index, 1);
    persistPhrases();
  }

  init();
})();
