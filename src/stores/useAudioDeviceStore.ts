import { create } from 'zustand'
import { STORAGE_KEYS } from '@/constants'
import type { MixerLevels } from '@/types'

interface AudioGraphNodes {
  audioContext: AudioContext
  micGainRef: GainNode
  soundboardGainRef: GainNode
  masterGainRef: GainNode
  analyserMicRef: AnalyserNode
  analyserSoundboardRef: AnalyserNode
  analyserMasterRef: AnalyserNode
  mediaStreamSourceRef: MediaStreamAudioSourceNode | null
}

interface AudioDeviceState {
  audioContext: AudioContext | null
  soundboardGainRef: GainNode | null
  micGainRef: GainNode | null
  masterGainRef: GainNode | null
  analyserMicRef: AnalyserNode | null
  analyserSoundboardRef: AnalyserNode | null
  analyserMasterRef: AnalyserNode | null
  mixerLevels: MixerLevels
  selectedInputDeviceId: string | null
  selectedOutputDeviceId: string | null
  inputDevices: MediaDeviceInfo[]
  outputDevice: MediaDeviceInfo | { deviceId: string; label: string } | null
  micStream: MediaStream | null
  micMuted: boolean
  error: string | null
  outputSelectSupported: boolean
  mediaStreamSourceRef: MediaStreamAudioSourceNode | null
}

interface AudioDeviceActions {
  setAudioGraph: (nodes: AudioGraphNodes) => void
  clearAudioGraph: () => void
  setMixerLevels: (levels: MixerLevels | ((prev: MixerLevels) => MixerLevels)) => void
  setInputDevice: (deviceId: string | null) => void
  setMicMuted: (muted: boolean) => void
  setError: (err: string | null) => void
  selectOutputDevice: () => Promise<void>
  refreshInputDevices: () => Promise<MediaDeviceInfo[]>
  setMicStream: (stream: MediaStream | null) => void
  setOutputDevice: (device: MediaDeviceInfo | { deviceId: string; label: string } | null) => void
  setSelectedOutputDeviceId: (id: string | null) => void
  setInputDevices: (devices: MediaDeviceInfo[]) => void
  setOutputSelectSupported: (supported: boolean) => void
  setMediaStreamSourceRef: (source: MediaStreamAudioSourceNode | null) => void
}

const initialInputId = localStorage.getItem(STORAGE_KEYS.INPUT_DEVICE_ID)
const initialOutputId = localStorage.getItem(STORAGE_KEYS.OUTPUT_DEVICE_ID)

export const useAudioDeviceStore = create<AudioDeviceState & AudioDeviceActions>((set, get) => ({
  audioContext: null,
  soundboardGainRef: null,
  micGainRef: null,
  masterGainRef: null,
  analyserMicRef: null,
  analyserSoundboardRef: null,
  analyserMasterRef: null,
  mixerLevels: { mic: 1, soundboard: 1, master: 1 },
  selectedInputDeviceId: initialInputId,
  selectedOutputDeviceId: initialOutputId,
  inputDevices: [],
  outputDevice: null,
  micStream: null,
  micMuted: false,
  error: null,
  outputSelectSupported: false,
  mediaStreamSourceRef: null,

  setAudioGraph: (nodes) =>
    set({
      audioContext: nodes.audioContext,
      soundboardGainRef: nodes.soundboardGainRef,
      micGainRef: nodes.micGainRef,
      masterGainRef: nodes.masterGainRef,
      analyserMicRef: nodes.analyserMicRef,
      analyserSoundboardRef: nodes.analyserSoundboardRef,
      analyserMasterRef: nodes.analyserMasterRef,
      mediaStreamSourceRef: nodes.mediaStreamSourceRef,
    }),

  clearAudioGraph: () =>
    set({
      audioContext: null,
      soundboardGainRef: null,
      micGainRef: null,
      masterGainRef: null,
      analyserMicRef: null,
      analyserSoundboardRef: null,
      analyserMasterRef: null,
      mediaStreamSourceRef: null,
    }),

  setMixerLevels: (levels) =>
    set({
      mixerLevels:
        typeof levels === 'function' ? levels(get().mixerLevels) : levels,
    }),

  setInputDevice: (deviceId) => {
    if (deviceId) {
      localStorage.setItem(STORAGE_KEYS.INPUT_DEVICE_ID, deviceId)
    } else {
      localStorage.removeItem(STORAGE_KEYS.INPUT_DEVICE_ID)
    }
    set({ selectedInputDeviceId: deviceId })
  },

  setMicMuted: (muted) => set({ micMuted: muted }),
  setError: (err) => set({ error: err }),
  setMicStream: (stream) => set({ micStream: stream }),
  setOutputDevice: (device) => set({ outputDevice: device }),
  setSelectedOutputDeviceId: (id) => set({ selectedOutputDeviceId: id }),
  setInputDevices: (devices) => set({ inputDevices: devices }),
  setOutputSelectSupported: (supported) => set({ outputSelectSupported: supported }),
  setMediaStreamSourceRef: (source) => set({ mediaStreamSourceRef: source }),

  selectOutputDevice: async () => {
    if (!navigator.mediaDevices?.selectAudioOutput) {
      set({ error: 'Output device selection is not supported in this browser. Use Chrome or Edge.' })
      return
    }
    try {
      set({ error: null })
      const device = await navigator.mediaDevices.selectAudioOutput()
      localStorage.setItem(STORAGE_KEYS.OUTPUT_DEVICE_ID, device.deviceId)
      set({
        outputDevice: device,
        selectedOutputDeviceId: device.deviceId,
      })
    } catch (err) {
      if ((err as Error).name !== 'NotAllowedError') {
        set({ error: (err as Error).message || 'Failed to select output device' })
      }
    }
  },

  refreshInputDevices: async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const inputs = devices.filter((d) => d.kind === 'audioinput')
      set({ inputDevices: inputs })
      return inputs
    } catch (err) {
      set({ error: (err as Error).message })
      return []
    }
  },
}))
