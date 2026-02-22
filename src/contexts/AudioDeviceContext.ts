import { createContext, useContext } from 'react'

export interface AudioDeviceContextValue {
  audioContext: AudioContext | null
  outputDevice: MediaDeviceInfo | { deviceId: string; label: string } | null
  outputSelectSupported: boolean
  inputDevices: MediaDeviceInfo[]
  selectedInputDeviceId: string | null
  selectedOutputDeviceId: string | null
  selectOutputDevice: () => Promise<void>
  setInputDevice: (_deviceId: string | null) => void
  micStream: MediaStream | null
  micMuted: boolean
  setMicMuted: (_muted: boolean) => void
  error: string | null
  setError: (_err: string | null) => void
  refreshInputDevices: () => Promise<MediaDeviceInfo[]>
  mediaStreamSourceRef: React.RefObject<MediaStreamAudioSourceNode | null>
  micGainRef: React.RefObject<GainNode | null>
  soundboardGainRef: React.RefObject<GainNode | null>
  masterGainRef: React.RefObject<GainNode | null>
  analyserMicRef: React.RefObject<AnalyserNode | null>
  analyserSoundboardRef: React.RefObject<AnalyserNode | null>
  analyserMasterRef: React.RefObject<AnalyserNode | null>
  mixerLevels: { mic: number; soundboard: number; master: number }
  setMixerLevels: React.Dispatch<React.SetStateAction<{ mic: number; soundboard: number; master: number }>>
}

export const AudioDeviceContext = createContext<AudioDeviceContextValue | null>(null)

export function useAudioDeviceContext(): AudioDeviceContextValue {
  const context = useContext(AudioDeviceContext)
  if (!context) {
    throw new Error('useAudioDeviceContext must be used within AudioDeviceProvider')
  }
  return context
}
