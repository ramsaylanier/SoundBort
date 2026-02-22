# SoundBort

A gaming soundboard web application. Mix microphone input with soundboard sounds and route to your selected output device (speakers, headset, or virtual audio cable for streaming).

## Features

- **Sound grid**: Configurable grid (2–8 rows × 2–8 cols); click or drag-and-drop to add audio (MP3, WAV, OGG, WebM, max 5MB)
- **Record audio**: Record from microphone or capture from a browser tab (Chrome/Edge)
- **Clip editing**: Trim sounds with start/end markers and rename clips
- **Keyboard bindings**: One key combination per sound (e.g. Ctrl+1)
- **MIDI bindings**: Bind MIDI controller notes to sounds (enable in Settings)
- **Mixer**: Per-sound volume with level meters, plus Mic, Soundboard, and Master bus levels
- **Device selection**: Choose microphone input and audio output (Chrome/Edge)
- **Save/load soundboards**: Create, save, load, switch, and delete boards; stored in IndexedDB with mixer levels
- **Mute mic**: Quick toggle without changing levels
- **Settings**: Adjust grid layout and enable/disable MIDI

## Run

```bash
npm install
npm run dev
```

Open http://localhost:5173 (HTTPS required for device APIs in production).

## Browser support

- **Output device selection**: Chrome 98+, Edge 98+ (Firefox/Safari use default output)
- **Microphone**: All modern browsers with getUserMedia
- **Tab capture (record from tab)**: Chrome, Edge
- **MIDI**: Chrome, Edge (Web MIDI API)
