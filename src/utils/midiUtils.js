const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

/**
 * Convert MIDI note number (0-127) to note name (e.g. "C4", "F#3").
 * @param {number} note - MIDI note number
 * @returns {string}
 */
export function noteNumberToName(note) {
  if (note == null || note < 0 || note > 127) return String(note ?? '')
  const name = NOTE_NAMES[note % 12]
  const octave = Math.floor(note / 12) - 1
  return `${name}${octave}`
}

const NOTE_ON = 0x90

/**
 * Parse MIDI message data. Returns { note, channel } for Note On (velocity > 0) or null.
 * @param {Uint8Array|number[]} data - Raw MIDI message data
 * @returns {{ note: number, channel: number } | null}
 */
export function parseMidiMessage(data) {
  if (!data || data.length < 3) return null
  const status = data[0] & 0xf0
  const channel = data[0] & 0x0f
  const note = data[1]
  const velocity = data[2]
  if (status === NOTE_ON && velocity > 0) {
    return { note, channel }
  }
  return null
}

/**
 * Check if a MIDI message matches a binding.
 * @param {{ note: number, channel: number }} parsed - Parsed message from parseMidiMessage
 * @param {{ note: number, channel: number }} binding - Stored binding
 * @returns {boolean}
 */
export function midiBindingMatches(parsed, binding) {
  if (!parsed || !binding) return false
  return parsed.note === binding.note && parsed.channel === binding.channel
}
