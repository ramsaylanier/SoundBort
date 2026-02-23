const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export interface MidiParsed {
  note: number
  channel: number
}

export function noteNumberToName(note: number | null | undefined): string {
  if (note == null || note < 0 || note > 127) return String(note ?? '')
  const name = NOTE_NAMES[note % 12]
  const octave = Math.floor(note / 12) - 1
  return `${name}${octave}`
}

const NOTE_ON = 0x90

export function parseMidiMessage(data: Uint8Array | number[]): MidiParsed | null {
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

export function midiBindingMatches(
  parsed: MidiParsed | null,
  binding: MidiParsed | null,
  eventDeviceId?: string,
  bindingDeviceId?: string,
  defaultDeviceId?: string
): boolean {
  if (!parsed || !binding) return false
  if (parsed.note !== binding.note || parsed.channel !== binding.channel) return false
  if (bindingDeviceId) return eventDeviceId === bindingDeviceId
  if (defaultDeviceId) return eventDeviceId === defaultDeviceId
  return true
}

export function midiBindingsConflict(
  a: { note: number; channel: number; deviceId?: string },
  b: { note: number; channel: number; deviceId?: string }
): boolean {
  if (a.note !== b.note || a.channel !== b.channel) return false
  if (!a.deviceId && !b.deviceId) return true
  if (a.deviceId && b.deviceId) return a.deviceId === b.deviceId
  return true
}
