# SpeakForMe

Type it, hear it. A desktop app (Mac/Windows) that speaks your typed text aloud in
a natural voice, so you can take part in a phone call without speaking. See
[spec.md](./spec.md) for the full product spec.

## How it works

Have your phone call in progress as normal (speakerphone or handset). Keep this
app open on your computer. Type a response and press **Enter**, or click a
**Quick Phrase** button — the computer speaks it out loud. Hold your phone up to
the computer's speaker (or route computer audio into the call via a cable/audio
interface) so the other person hears it.

## Setup

```bash
npm install
npm start
```

On first launch, open **Settings** and paste in an [ElevenLabs](https://elevenlabs.io)
API key, then click **Load voices** and pick one. Without a key (or if the API is
unreachable), SpeakForMe automatically falls back to your operating system's
built-in voice (macOS `say`, Windows SAPI, Linux `espeak`) so it's never silent.

## One-click launch (Windows)

After running `npm install` once, you don't need Command Prompt again:

1. Right-click an empty spot on your Desktop → **New** → **Shortcut**.
2. For the location, enter (adjust the path to where you cloned the repo):
   ```
   "<path-to-speakforme>\node_modules\electron\dist\electron.exe" "<path-to-speakforme>"
   ```
   e.g. `"C:\Users\you\Desktop\speakforme\node_modules\electron\dist\electron.exe" "C:\Users\you\Desktop\speakforme"`
3. Name it `SpeakForMe` and finish.

Double-click that shortcut any time to open SpeakForMe directly, no console window.
(A `Start SpeakForMe.vbs` script is also included in the project folder as an
alternative, but some machines have Windows Script Host disabled by policy, in
which case the shortcut above is the reliable option.)

## Features

- **Speak bar** — type and press Enter to speak instantly; Shift+Enter for a
  newline. Global hotkey `Ctrl/Cmd+Shift+Space` brings the window to focus from
  anywhere.
- **Quick Phrases** — one-click common responses, organized by category, fully
  editable (add/edit/delete/reorder) via "Manage phrases".
- **History** — everything spoken this session and previously; click any line to
  speak it again.
- **Settings** — API key, voice picker, speech speed, output audio device, text
  size, high-contrast mode, always-on-top toggle.
- **Custom voice** — upload 1–3 short audio clips of a voice (e.g. your own,
  recorded before surgery) and SpeakForMe clones it via ElevenLabs so you can
  speak in that voice going forward.
- **Mood** — pick Neutral/Happy/Sad/Angry/Excited above the Speak bar to color
  how a line is delivered. Non-neutral moods use ElevenLabs' more expressive
  (and slower) `eleven_v3` model; Neutral stays on the fast model used
  everywhere else. Falls back to your normal voice automatically if a mood
  isn't available on your plan.
- **Read a Document** — open a Word (.docx) or PDF file and SpeakForMe splits
  it into paragraph-sized chunks. Step through with Previous/Next; each one
  loads into the Speak bar so you can review or edit it before pressing
  Speak. Handy for reading a prepared statement aloud during a call.

## Data storage

Phrases, history, and settings are stored locally as JSON in the app's user data
directory (no cloud, no accounts). The API key never leaves your machine except
in direct calls to ElevenLabs.
