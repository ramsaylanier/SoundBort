export interface MidiBinding {
  note: number
  channel: number
  deviceId?: string
}

export interface MidiDeviceOption {
  id: string
  name: string
}

export interface Sound {
  id: string
  name: string
  audioBlob: Blob
  keybindings: string[]
  midiBindings: MidiBinding[]
  volume?: number
  startTime?: number
  endTime?: number | null
}

export interface MixerLevels {
  mic: number
  soundboard: number
  master: number
}

export interface Soundboard {
  id: string
  name: string
  sounds: (Sound | null)[]
  mixer?: MixerLevels
}
