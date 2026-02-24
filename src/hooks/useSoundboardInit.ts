import { useCallback, useEffect, useRef } from 'react'
import { useAudioDeviceStore } from '@/stores/useAudioDeviceStore'
import { useSoundboardStore } from '@/stores/useSoundboardStore'
import type { Sound, Soundboard } from '@/types'

export function useSoundboardInit() {
  const audioContext = useAudioDeviceStore((s) => s.audioContext)
  const soundboardGainRef = useAudioDeviceStore((s) => s.soundboardGainRef)
  const setPlayingSoundId = useSoundboardStore((s) => s.setPlayingSoundId)
  const setLevelBySoundId = useSoundboardStore((s) => s.setLevelBySoundId)
  const registerSoundboardEngine = useSoundboardStore((s) => s.registerSoundboardEngine)

  const audioBuffersRef = useRef(new Map<string, AudioBuffer>())
  const gainNodesRef = useRef(new Map<string, GainNode>())
  const analyserNodesRef = useRef(new Map<string, AnalyserNode>())

  const getOrCreateGainNode = useCallback(
    (soundId: string): GainNode | null => {
      if (!audioContext || !soundboardGainRef) return null
      let gain = gainNodesRef.current.get(soundId)
      if (!gain) {
        gain = audioContext.createGain()
        gain.gain.value = 1
        const analyser = audioContext.createAnalyser()
        analyser.fftSize = 256
        analyser.smoothingTimeConstant = 0.8
        gain.connect(analyser)
        analyser.connect(soundboardGainRef)
        gainNodesRef.current.set(soundId, gain)
        analyserNodesRef.current.set(soundId, analyser)
      }
      return gain
    },
    [audioContext, soundboardGainRef]
  )

  const playSound = useCallback(
    async (sound: Sound, volume = 1) => {
      if (!audioContext || !sound?.audioBlob) return
      if (audioContext.state === 'suspended') {
        try {
          await audioContext.resume()
        } catch {
          /* resume may fail without user gesture (e.g. MIDI); document listener handles first interaction */
        }
      }
      try {
        let buffer = audioBuffersRef.current.get(sound.id)
        if (!buffer) {
          const arrayBuffer = await sound.audioBlob.arrayBuffer()
          const decoded = await audioContext.decodeAudioData(arrayBuffer)
          audioBuffersRef.current.set(sound.id, decoded)
          buffer = decoded
        }
        const buf = audioBuffersRef.current.get(sound.id)
        if (!buf) return
        const source = audioContext.createBufferSource()
        source.buffer = buf
        const gain = getOrCreateGainNode(sound.id)
        if (gain) {
          gain.gain.value = volume
          source.connect(gain)
        } else if (soundboardGainRef) {
          source.connect(soundboardGainRef)
        }
        source.onended = () => {
          const current = useSoundboardStore.getState().playingSoundId
          if (current === sound.id) setPlayingSoundId(null)
        }
        setPlayingSoundId(sound.id)
        const offset = sound.startTime ?? 0
        const duration = sound.endTime != null ? sound.endTime - offset : undefined
        source.start(0, offset, duration)
      } catch (err) {
        console.error('Failed to play sound:', err)
      }
    },
    [audioContext, soundboardGainRef, getOrCreateGainNode, setPlayingSoundId]
  )

  const setSoundVolume = useCallback(
    (soundId: string, volume: number) => {
      const gain = getOrCreateGainNode(soundId)
      if (gain) gain.gain.value = volume
    },
    [getOrCreateGainNode]
  )

  const onLoadSoundboard = useCallback(
    (board: Soundboard) => {
      gainNodesRef.current.clear()
      analyserNodesRef.current.clear()
      audioBuffersRef.current.clear()
      setLevelBySoundId({})
      if (audioContext && board?.sounds) {
        Promise.all(
          board.sounds.filter((s): s is Sound => Boolean(s)).map(async (s) => {
            if (!s?.audioBlob) return
            try {
              const arrayBuffer = await s.audioBlob.arrayBuffer()
              const decoded = await audioContext.decodeAudioData(arrayBuffer)
              audioBuffersRef.current.set(s.id, decoded)
            } catch (err) {
              console.error('Failed to preload sound:', err)
            }
          })
        ).catch(console.error)
      }
    },
    [audioContext, setLevelBySoundId]
  )

  // Register engine when we have audio context
  useEffect(() => {
    if (audioContext && soundboardGainRef) {
      registerSoundboardEngine(playSound, setSoundVolume, onLoadSoundboard)
    }
  }, [audioContext, soundboardGainRef, playSound, setSoundVolume, onLoadSoundboard, registerSoundboardEngine])

  // RAF loop for level meters
  useEffect(() => {
    let rafId: number
    const dataArrays = new Map<string, Uint8Array>()

    function tick() {
      const levels: Record<string, number> = {}
      for (const [soundId, analyser] of analyserNodesRef.current) {
        let dataArray = dataArrays.get(soundId)
        if (!dataArray) {
          dataArray = new Uint8Array(analyser.frequencyBinCount)
          dataArrays.set(soundId, dataArray)
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- AnalyserNode.getByteFrequencyData has strict ArrayBuffer typing
        analyser.getByteFrequencyData(dataArray as any)
        let sum = 0
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i]! * dataArray[i]!
        }
        const rms = Math.sqrt(sum / dataArray.length)
        levels[soundId] = rms / 255
      }
      setLevelBySoundId(levels)
      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [setLevelBySoundId])
}
