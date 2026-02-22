# SoundBort

A gaming soundboard web application. Mix microphone input with soundboard sounds and route to your selected output device (speakers, headset, or virtual audio cable for streaming).

## Features

- **Sound grid**: 4x4 grid of sound cells; click or drag-and-drop to add audio (MP3, WAV, OGG, WebM, max 5MB)
- **Keyboard bindings**: Bind multiple keys per sound (e.g. F1, Ctrl+1)
- **Mixer**: Per-sound volume, plus Mic, Soundboard, and Master bus levels
- **Device selection**: Choose microphone input and audio output (Chrome/Edge)
- **Save/load soundboards**: Stored in IndexedDB; create, save, and switch between boards
- **Mute mic**: Quick toggle without changing levels

## Run

```bash
npm install
npm run dev
```

Open http://localhost:5173 (HTTPS required for device APIs in production).

## Browser support

- **Output device selection**: Chrome 98+, Edge 98+ (Firefox/Safari use default output)
- **Microphone**: All modern browsers with getUserMedia
