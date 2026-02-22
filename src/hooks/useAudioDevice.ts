import { useState, useEffect, useCallback, useRef } from 'react'
import { STORAGE_KEYS } from '@/constants'

export function useAudioDevice() {
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null)
  const [outputDevice, setOutputDevice] = useState<MediaDeviceInfo | { deviceId: string; label: string } | null>(null)
  const [inputDevices, setInputDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedInputDeviceId, setSelectedInputDeviceId] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEYS.INPUT_DEVICE_ID)
  )
  const [selectedOutputDeviceId, setSelectedOutputDeviceId] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEYS.OUTPUT_DEVICE_ID)
  )
  const [micStream, setMicStream] = useState<MediaStream | null>(null)
  const [micMuted, setMicMuted] = useState(false)
  const [mixerLevels, setMixerLevels] = useState({ mic: 1, soundboard: 1, master: 1 })
  const [error, setError] = useState<string | null>(null)
  const [outputSelectSupported, setOutputSelectSupported] = useState(false)
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const micGainRef = useRef<GainNode | null>(null)
  const soundboardGainRef = useRef<GainNode | null>(null)
  const masterGainRef = useRef<GainNode | null>(null)
  const analyserMicRef = useRef<AnalyserNode | null>(null)
  const analyserSoundboardRef = useRef<AnalyserNode | null>(null)
  const analyserMasterRef = useRef<AnalyserNode | null>(null)

  useEffect(() => {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const micGain = ctx.createGain()
    const soundboardGain = ctx.createGain()
    const masterGain = ctx.createGain()
    micGain.gain.value = 1
    soundboardGain.gain.value = 1
    masterGain.gain.value = 1

    const analyserMic = ctx.createAnalyser()
    analyserMic.fftSize = 256
    analyserMic.smoothingTimeConstant = 0.8
    const analyserSoundboard = ctx.createAnalyser()
    analyserSoundboard.fftSize = 256
    analyserSoundboard.smoothingTimeConstant = 0.8
    const analyserMaster = ctx.createAnalyser()
    analyserMaster.fftSize = 256
    analyserMaster.smoothingTimeConstant = 0.8

    micGain.connect(analyserMic)
    analyserMic.connect(masterGain)
    soundboardGain.connect(analyserSoundboard)
    analyserSoundboard.connect(masterGain)
    masterGain.connect(analyserMaster)
    analyserMaster.connect(ctx.destination)

    micGainRef.current = micGain
    soundboardGainRef.current = soundboardGain
    masterGainRef.current = masterGain
    analyserMicRef.current = analyserMic
    analyserSoundboardRef.current = analyserSoundboard
    analyserMasterRef.current = analyserMaster
    queueMicrotask(() => {
      setAudioContext(ctx)
      setOutputSelectSupported(!!navigator.mediaDevices?.selectAudioOutput)
    })
    return () => {
      ctx.close()
    }
  }, [])

  const refreshInputDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const inputs = devices.filter((d) => d.kind === 'audioinput')
      setInputDevices(inputs)
      return inputs
    } catch (err) {
      setError((err as Error).message)
      return []
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        stream.getTracks().forEach((t) => t.stop())
        await refreshInputDevices()
      } catch {
        await refreshInputDevices()
      }
    }
    init()
  }, [refreshInputDevices])

  const selectOutputDevice = useCallback(async () => {
    if (!navigator.mediaDevices?.selectAudioOutput) {
      setError('Output device selection is not supported in this browser. Use Chrome or Edge.')
      return
    }
    try {
      setError(null)
      const device = await navigator.mediaDevices.selectAudioOutput()
      setOutputDevice(device)
      setSelectedOutputDeviceId(device.deviceId)
      localStorage.setItem(STORAGE_KEYS.OUTPUT_DEVICE_ID, device.deviceId)
    } catch (err) {
      if ((err as Error).name !== 'NotAllowedError') {
        setError((err as Error).message || 'Failed to select output device')
      }
    }
  }, [])

  useEffect(() => {
    if (!audioContext || !selectedOutputDeviceId) return
    if ('setSinkId' in audioContext && typeof audioContext.setSinkId === 'function') {
      (audioContext as AudioContext & { setSinkId: (id: string) => Promise<void> })
        .setSinkId(selectedOutputDeviceId)
        .catch((err: unknown) => {
          setError((err as Error).message || 'Failed to set output device')
        })
    }
  }, [audioContext, selectedOutputDeviceId])

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.OUTPUT_DEVICE_ID)
    if (stored && outputSelectSupported) {
      queueMicrotask(() => {
        setSelectedOutputDeviceId(stored)
        setOutputDevice({ deviceId: stored, label: 'Saved device' })
      })
    }
  }, [outputSelectSupported])

  useEffect(() => {
    let stream: MediaStream | null = null
    const startMic = async () => {
      if (!selectedInputDeviceId) {
        setMicStream(null)
        return
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: { exact: selectedInputDeviceId } },
        })
        setMicStream(stream)
        setError(null)
      } catch (err) {
        setError((err as Error).message || 'Failed to access microphone')
        setMicStream(null)
      }
    }
    startMic()
    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop())
      }
    }
  }, [selectedInputDeviceId])

  useEffect(() => {
    if (!audioContext || !micStream || !micGainRef.current) return
    if (mediaStreamSourceRef.current) {
      try {
        mediaStreamSourceRef.current.disconnect()
      } catch {
        /* already disconnected */
      }
    }
    const source = audioContext.createMediaStreamSource(micStream)
    mediaStreamSourceRef.current = source
    source.connect(micGainRef.current)
    return () => {
      try {
        source.disconnect()
      } catch {
        /* already disconnected */
      }
      mediaStreamSourceRef.current = null
    }
  }, [audioContext, micStream])

  const setInputDevice = useCallback((deviceId: string | null) => {
    setSelectedInputDeviceId(deviceId)
    if (deviceId) {
      localStorage.setItem(STORAGE_KEYS.INPUT_DEVICE_ID, deviceId)
    } else {
      localStorage.removeItem(STORAGE_KEYS.INPUT_DEVICE_ID)
    }
  }, [])

  useEffect(() => {
    if (micGainRef.current) {
      micGainRef.current.gain.value = micMuted ? 0 : mixerLevels.mic
    }
  }, [micMuted, mixerLevels.mic])

  useEffect(() => {
    if (soundboardGainRef.current) {
      soundboardGainRef.current.gain.value = mixerLevels.soundboard
    }
  }, [mixerLevels.soundboard])

  useEffect(() => {
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = mixerLevels.master
    }
  }, [mixerLevels.master])

  return {
    audioContext,
    outputDevice,
    outputSelectSupported,
    inputDevices,
    selectedInputDeviceId,
    selectedOutputDeviceId,
    selectOutputDevice,
    setInputDevice,
    micStream,
    micMuted,
    setMicMuted,
    error,
    setError,
    refreshInputDevices,
    mediaStreamSourceRef,
    micGainRef,
    soundboardGainRef,
    masterGainRef,
    analyserMicRef,
    analyserSoundboardRef,
    analyserMasterRef,
    mixerLevels,
    setMixerLevels,
  }
}
