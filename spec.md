# SpeakForMe — MVP Spec

## 1. Problem Statement

The user had tongue and throat surgery and can no longer speak. They need a way to
participate in phone calls: someone calls them (or they call someone), and instead of
speaking, they **type** a response which a **human-like computer voice speaks aloud**
so the other person on the call can hear it.

## 2. Assumed Setup (please confirm/correct)

The app runs on a **desktop computer (Mac/Windows)**. The actual phone call happens on
the user's phone as normal. To get the typed speech into the call:

- The user types in the desktop app.
- The app plays the spoken audio out of the **computer's speakers**.
- The user holds their **phone up to the computer speaker** (phone mic picks up the
  computer's voice and transmits it into the call), OR routes computer audio into the
  phone via a cable/audio interface if available.

> ⚠️ If this isn't the intended setup (e.g., you actually want the phone itself to
> speak, or you're using a headset/Bluetooth loopback), let's revise this section
> before building — it affects the audio output requirements.

## 3. MVP Goals

- Type a sentence, hit Enter (or click Speak), and hear it spoken in a natural,
  human-like voice within ~1–2 seconds.
- One-click "Quick Phrases" panel for common responses ("Hold on one second,"
  "Can you repeat that?", "Yes," "No," "Thank you for calling," etc.).
- Editable phrase library (add/edit/delete/reorder/categorize).
- Fast enough and reliable enough to use in a live conversation.
- Simple, large, high-contrast UI usable while stressed/multitasking during a call.

## 4. Non-Goals (out of scope for MVP)

- No native iOS/Android app.
- No automatic call detection or telephony/VoIP integration.
- No real-time conversation transcription of the other speaker (this app only
  handles the user's outgoing speech).
- No multi-user accounts, cloud sync, or login system.
- No accessibility beyond desktop keyboard/large text (screen-reader support can
  come later).

## 5. Core User Flow

1. Phone rings → user answers the phone as normal (on speaker or handset).
2. User opens the desktop app (kept open/ready at all times, ideally).
3. Either:
   - Types a full sentence in the main text box and presses **Enter** → it's spoken.
   - Clicks a **Quick Phrase** button → it's spoken immediately, no typing needed.
4. Audio plays through the selected system speaker output.
5. Spoken text is added to a **history log** (so it can be replayed or reused with
   one click if the user needs to repeat themselves).

## 6. Tech Stack (proposed)

- **Framework:** Electron (cross-platform desktop, Mac + Windows from one codebase).
- **Frontend:** Plain HTML/CSS/JS (or React if the project grows) — kept simple for
  MVP speed and low latency.
- **TTS Engine:** ElevenLabs API (best-in-class human-like, low-latency streaming
  voice; ~$5/mo starter tier covers casual daily use). Fallback to the OS's built-in
  TTS (macOS `say` / Windows SAPI) if there's no internet connection or no API key
  configured, so the app never goes completely silent.
- **Local storage:** JSON file or SQLite for phrases + history (no cloud needed for
  MVP).
- **Audio playback:** Native audio output via Electron/Node, with a dropdown to pick
  which system speaker/output device to use.

## 7. Feature Breakdown

### 7.1 Speak Bar (core feature)
- Large text input, always focused/ready.
- Enter key = speak immediately. Shift+Enter = newline (for longer typed responses).
- "Speak" button as a mouse-friendly alternative to Enter.
- Visual state: idle / "speaking..." / done — big and obvious, since the user is
  mid-conversation and needs at-a-glance feedback.
- Global hotkey (e.g., configurable, default `Ctrl+Shift+Space` / `Cmd+Shift+Space`)
  to bring the Speak Bar to focus from anywhere, in case the app is minimized.

### 7.2 Quick Phrases Panel
- Grid of buttons, each showing a short label; clicking speaks the full phrase
  instantly (no typing).
- Default starter set, e.g.:
  - "Hello, thanks for calling."
  - "One moment please."
  - "Sorry, I can't speak — I'm typing my responses."
  - "Yes."
  - "No."
  - "Can you say that again?"
  - "Can you slow down a little?"
  - "Thank you, goodbye."
- User can add/edit/delete/reorder phrases.
- Optional simple categories/tabs (e.g., "Greetings," "Yes/No," "Closing") once the
  list grows beyond ~10-15 phrases.

### 7.3 History
- Running list of everything spoken this session (and persisted across sessions).
- Click any past line to speak it again instantly — useful when asked "sorry, what
  did you say?"

### 7.4 Settings
- ElevenLabs API key entry (stored locally, never sent anywhere but the API).
- Voice picker (pull list of available voices from ElevenLabs, preview/play sample).
- Speech speed adjustment.
- Output audio device selector.
- Text size / high-contrast toggle.

## 8. Non-Functional Requirements

- **Latency:** target under ~1.5 seconds from Enter/click to audio start. This is
  the single most important quality bar — a real conversation can't tolerate long
  pauses.
- **Reliability:** if the API call fails (no internet, bad key, rate limit), fall
  back to local OS TTS automatically rather than staying silent.
- **Simplicity under pressure:** UI must be usable one-handed, at a glance, while
  the user is actively on a call and possibly anxious/rushed.

## 9. Suggested Project Structure

```
speakforme/
├── package.json
├── main.js                # Electron main process
├── preload.js
├── src/
│   ├── index.html
│   ├── renderer.js         # UI logic: speak bar, phrases, history
│   ├── tts.js              # ElevenLabs API + OS TTS fallback
│   ├── storage.js          # phrase/history persistence (JSON/SQLite)
│   └── styles.css
└── data/
    ├── phrases.json
    └── history.json
```

## 10. Open Questions Before Build

1. Confirm the audio-routing assumption in Section 2 — is holding the phone up to
   the computer speaker actually the plan, or is there a different audio path
   (e.g., a cable, a Bluetooth speaker, virtual audio cable software)?
2. Any preference between Mac vs Windows as the primary target for polish (Electron
   supports both, but worth knowing which to test first)?
3. Should the app stay always-on-top so it's instantly visible when a call comes in?
