const { spawn, exec } = require('child_process');
const os = require('os');

const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1';

// Speaks via ElevenLabs and returns the raw MP3 bytes for the renderer to play.
// Throws on any failure (bad key, no network, rate limit, etc.) so the caller
// can fall back to local OS TTS.
async function speakElevenLabs({ text, apiKey, voiceId, speed }) {
  if (!apiKey) throw new Error('No ElevenLabs API key configured');
  if (!voiceId) throw new Error('No ElevenLabs voice selected');

  const url = `${ELEVENLABS_BASE}/text-to-speech/${encodeURIComponent(voiceId)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg'
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_turbo_v2_5',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        speed: clampSpeed(speed)
      }
    })
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`ElevenLabs error ${res.status}: ${detail.slice(0, 300)}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function listVoices(apiKey) {
  if (!apiKey) throw new Error('No ElevenLabs API key configured');
  const res = await fetch(`${ELEVENLABS_BASE}/voices`, {
    headers: { 'xi-api-key': apiKey }
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`ElevenLabs error ${res.status}: ${detail.slice(0, 300)}`);
  }
  const data = await res.json();
  return (data.voices || []).map((v) => ({ id: v.voice_id, name: v.name }));
}

// Clones a voice from one or more uploaded audio samples via ElevenLabs'
// Instant Voice Cloning API. Returns the new voice so it can be selected
// immediately, same as any built-in ElevenLabs voice.
async function addVoice({ apiKey, name, description, samples }) {
  if (!apiKey) throw new Error('No ElevenLabs API key configured');
  if (!name || !name.trim()) throw new Error('Voice name is required');
  if (!samples || !samples.length) throw new Error('At least one audio sample is required');

  const form = new FormData();
  form.append('name', name.trim());
  if (description) form.append('description', description);
  for (const sample of samples) {
    const bytes = Buffer.from(sample.data, 'base64');
    form.append('files', new Blob([bytes]), sample.filename || 'sample.mp3');
  }

  const res = await fetch(`${ELEVENLABS_BASE}/voices/add`, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey },
    body: form
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`ElevenLabs error ${res.status}: ${detail.slice(0, 300)}`);
  }

  const data = await res.json();
  return { id: data.voice_id, name: name.trim() };
}

function clampSpeed(speed) {
  const n = Number(speed);
  if (Number.isNaN(n)) return 1.0;
  return Math.min(1.2, Math.max(0.7, n));
}

// Local OS text-to-speech fallback. Speaks directly through the system's
// default audio output (device selection is not available in this path).
function speakOSFallback(text, speed) {
  return new Promise((resolve, reject) => {
    const platform = os.platform();
    const safeText = String(text);

    if (platform === 'darwin') {
      const rate = Math.round(175 * clampSpeed(speed));
      const child = spawn('say', ['-r', String(rate), safeText]);
      child.on('error', reject);
      child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`say exited ${code}`))));
      return;
    }

    if (platform === 'win32') {
      const rate = Math.round((clampSpeed(speed) - 1) * 10); // SAPI rate: -10..10
      const escaped = safeText.replace(/"/g, '`"').replace(/'/g, "''");
      const psCommand = [
        'Add-Type -AssemblyName System.Speech;',
        '$s = New-Object System.Speech.Synthesis.SpeechSynthesizer;',
        `$s.Rate = ${rate};`,
        `$s.Speak('${escaped}');`
      ].join(' ');
      exec(`powershell -NoProfile -Command "${psCommand}"`, (err) => {
        if (err) reject(err);
        else resolve();
      });
      return;
    }

    // Linux fallback: try espeak-ng, then espeak, then spd-say.
    const wpm = Math.round(160 * clampSpeed(speed));
    const child = spawn('espeak-ng', ['-s', String(wpm), safeText]);
    child.on('error', () => {
      const fallback = spawn('espeak', ['-s', String(wpm), safeText]);
      fallback.on('error', reject);
      fallback.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`espeak exited ${code}`))));
    });
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`espeak-ng exited ${code}`))));
  });
}

module.exports = { speakElevenLabs, listVoices, addVoice, speakOSFallback };
