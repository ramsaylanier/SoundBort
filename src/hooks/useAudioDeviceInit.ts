import { useEffect } from 'react'
import { useAudioDeviceStore } from '@/stores/useAudioDeviceStore'
import { STORAGE_KEYS } from '@/constants'

export function useAudioDeviceInit() {
  const setAudioGraph = useAudioDeviceStore((s) => s.setAudioGraph)
  const clearAudioGraph = useAudioDeviceStore((s) => s.clearAudioGraph)
  const refreshInputDevices = useAudioDeviceStore((s) => s.refreshInputDevices)
  const selectedInputDeviceId = useAudioDeviceStore((s) => s.selectedInputDeviceId)
  const selectedOutputDeviceId = useAudioDeviceStore((s) => s.selectedOutputDeviceId)
  const mixerLevels = useAudioDeviceStore((s) => s.mixerLevels)
  const micMuted = useAudioDeviceStore((s) => s.micMuted)
  const setMicStream = useAudioDeviceStore((s) => s.setMicStream)
  const setOutputDevice = useAudioDeviceStore((s) => s.setOutputDevice)
  const setSelectedOutputDeviceId = useAudioDeviceStore((s) => s.setSelectedOutputDeviceId)
  const setOutputSelectSupported = useAudioDeviceStore((s) => s.setOutputSelectSupported)
  const setError = useAudioDeviceStore((s) => s.setError)
  const setMediaStreamSourceRef = useAudioDeviceStore((s) => s.setMediaStreamSourceRef)
  const audioContext = useAudioDeviceStore((s) => s.audioContext)
  const micGainRef = useAudioDeviceStore((s) => s.micGainRef)
  const soundboardGainRef = useAudioDeviceStore((s) => s.soundboardGainRef)
  const masterGainRef = useAudioDeviceStore((s) => s.masterGainRef)
  const outputSelectSupported = useAudioDeviceStore((s) => s.outputSelectSupported)
  const micStream = useAudioDeviceStore((s) => s.micStream)

  // Create audio graph on mount
  useEffect(() => {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AudioContextClass()
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

    queueMicrotask(() => {
      setAudioGraph({
        audioContext: ctx,
        micGainRef: micGain,
        soundboardGainRef: soundboardGain,
        masterGainRef: masterGain,
        analyserMicRef: analyserMic,
        analyserSoundboardRef: analyserSoundboard,
        analyserMasterRef: analyserMaster,
        mediaStreamSourceRef: null,
      })
      setOutputSelectSupported(!!navigator.mediaDevices?.selectAudioOutput)
    })

    return () => {
      ctx.close()
      clearAudioGraph()
    }
  }, [setAudioGraph, clearAudioGraph, setOutputSelectSupported])

  // Init: enumerate devices
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

  // Load stored output device when supported
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.OUTPUT_DEVICE_ID)
    if (stored && outputSelectSupported) {
      queueMicrotask(() => {
        setSelectedOutputDeviceId(stored)
        setOutputDevice({ deviceId: stored, label: 'Saved device' })
      })
    }
  }, [outputSelectSupported, setSelectedOutputDeviceId, setOutputDevice])

  // Mic stream when selectedInputDeviceId changes
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
  }, [selectedInputDeviceId, setMicStream, setError])

  // Connect mic stream to graph when audioContext and micStream available
  useEffect(() => {
    if (!audioContext || !micStream || !micGainRef) return

    const prevSource = useAudioDeviceStore.getState().mediaStreamSourceRef
    if (prevSource) {
      try {
        prevSource.disconnect()
      } catch {
        /* already disconnected */
      }
    }
    const source = audioContext.createMediaStreamSource(micStream)
    source.connect(micGainRef)
    setMediaStreamSourceRef(source)

    return () => {
      try {
        source.disconnect()
      } catch {
        /* already disconnected */
      }
      setMediaStreamSourceRef(null)
    }
  }, [audioContext, micStream, micGainRef, setMediaStreamSourceRef])

  // setSinkId when output device changes
  useEffect(() => {
    if (!audioContext || !selectedOutputDeviceId) return
    if ('setSinkId' in audioContext && typeof audioContext.setSinkId === 'function') {
      ;(audioContext as AudioContext & { setSinkId: (id: string) => Promise<void> })
        .setSinkId(selectedOutputDeviceId)
        .catch((err: unknown) => {
          setError((err as Error).message || 'Failed to set output device')
        })
    }
  }, [audioContext, selectedOutputDeviceId, setError])

  // Consolidated gain sync (Phase 4 cleanup - single effect)
  // Web Audio GainNode.gain.value is intentionally mutable - we sync store state to the audio graph
  useEffect(() => {
    /* eslint-disable react-hooks/immutability -- GainNode.gain.value is a Web Audio API mutable property */
    if (micGainRef) {
      micGainRef.gain.value = micMuted ? 0 : mixerLevels.mic
    }
    if (soundboardGainRef) {
      soundboardGainRef.gain.value = mixerLevels.soundboard
    }
    if (masterGainRef) {
      masterGainRef.gain.value = mixerLevels.master
    }
    /* eslint-enable react-hooks/immutability */
  }, [micGainRef, soundboardGainRef, masterGainRef, micMuted, mixerLevels])
}
