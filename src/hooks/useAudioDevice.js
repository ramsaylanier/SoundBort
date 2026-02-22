import { useState, useEffect, useCallback, useRef } from 'react'
import { STORAGE_KEYS } from '@/constants'

export function useAudioDevice() {
  const [audioContext, setAudioContext] = useState(null)
  const [outputDevice, setOutputDevice] = useState(null)
  const [inputDevices, setInputDevices] = useState([])
  const [selectedInputDeviceId, setSelectedInputDeviceId] = useState(() =>
    localStorage.getItem(STORAGE_KEYS.INPUT_DEVICE_ID)
  )
  const [selectedOutputDeviceId, setSelectedOutputDeviceId] = useState(() =>
    localStorage.getItem(STORAGE_KEYS.OUTPUT_DEVICE_ID)
  )
  const [micStream, setMicStream] = useState(null)
  const [micMuted, setMicMuted] = useState(false)
  const [mixerLevels, setMixerLevels] = useState({ mic: 1, soundboard: 1, master: 1 })
  const [error, setError] = useState(null)
  const [outputSelectSupported, setOutputSelectSupported] = useState(false)
  const mediaStreamSourceRef = useRef(null)
  const micGainRef = useRef(null)
  const soundboardGainRef = useRef(null)
  const masterGainRef = useRef(null)
  const analyserMicRef = useRef(null)
  const analyserSoundboardRef = useRef(null)
  const analyserMasterRef = useRef(null)

  // Create AudioContext, gain nodes, and analysers on mount
  useEffect(() => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
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
    setAudioContext(ctx)
    setOutputSelectSupported(!!navigator.mediaDevices?.selectAudioOutput)
    return () => ctx.close()
  }, [])

  // Enumerate input devices (requires permission first)
  const refreshInputDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const inputs = devices.filter((d) => d.kind === 'audioinput')
      setInputDevices(inputs)
      return inputs
    } catch (err) {
      setError(err.message)
      return []
    }
  }, [])

  // Request microphone permission and enumerate devices
  useEffect(() => {
    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        stream.getTracks().forEach((t) => t.stop())
        await refreshInputDevices()
      } catch {
        // Permission denied or not available - input devices may be empty
        await refreshInputDevices()
      }
    }
    init()
  }, [refreshInputDevices])

  // Select output device via browser prompt
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
      if (err.name !== 'NotAllowedError') {
        setError(err.message || 'Failed to select output device')
      }
    }
  }, [])

  // Set output device on AudioContext
  useEffect(() => {
    if (!audioContext || !selectedOutputDeviceId) return
    if (audioContext.setSinkId) {
      audioContext.setSinkId(selectedOutputDeviceId).catch((err) => {
        setError(err.message || 'Failed to set output device')
      })
    }
  }, [audioContext, selectedOutputDeviceId])

  // Restore output device from storage on load
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.OUTPUT_DEVICE_ID)
    if (stored && outputSelectSupported) {
      setSelectedOutputDeviceId(stored)
      setOutputDevice({ deviceId: stored, label: 'Saved device' })
    }
  }, [outputSelectSupported])

  // Start/stop mic stream when input device changes
  useEffect(() => {
    let stream = null
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
        setError(err.message || 'Failed to access microphone')
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

  // Connect mic to audio graph when stream and context are ready
  useEffect(() => {
    if (!audioContext || !micStream || !micGainRef.current) return
    if (mediaStreamSourceRef.current) {
      try {
        mediaStreamSourceRef.current.disconnect()
      } catch {}
    }
    const source = audioContext.createMediaStreamSource(micStream)
    mediaStreamSourceRef.current = source
    source.connect(micGainRef.current)
    return () => {
      try {
        source.disconnect()
      } catch {}
      mediaStreamSourceRef.current = null
    }
  }, [audioContext, micStream])

  const setInputDevice = useCallback((deviceId) => {
    setSelectedInputDeviceId(deviceId || null)
    if (deviceId) {
      localStorage.setItem(STORAGE_KEYS.INPUT_DEVICE_ID, deviceId)
    } else {
      localStorage.removeItem(STORAGE_KEYS.INPUT_DEVICE_ID)
    }
  }, [])

  // Apply mic mute and mixer levels
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
