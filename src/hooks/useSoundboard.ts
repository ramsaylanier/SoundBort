import { useState, useCallback, useRef, useEffect } from 'react'
import { getStoredGridSize } from '@/constants'
import type { Sound, Soundboard } from '@/types'

export function createEmptySoundboard(name = 'New Soundboard', gridSize?: number): Soundboard {
  const size =
    gridSize ??
    (() => {
      const { rows, cols } = getStoredGridSize()
      return rows * cols
    })()
  return {
    id: crypto.randomUUID(),
    name,
    sounds: Array.from({ length: size }, () => null),
    mixer: { mic: 1, soundboard: 1, master: 1 },
  }
}

export function useSoundboard(
  audioContext: AudioContext | null,
  soundboardGainRef: React.RefObject<GainNode | null>
) {
  const [soundboard, setSoundboard] = useState<Soundboard>(() => createEmptySoundboard())
  const [playingSoundId, setPlayingSoundId] = useState<string | null>(null)
  const [levelBySoundId, setLevelBySoundId] = useState<Record<string, number>>({})
  const audioBuffersRef = useRef(new Map<string, AudioBuffer>())
  const gainNodesRef = useRef(new Map<string, GainNode>())
  const analyserNodesRef = useRef(new Map<string, AnalyserNode>())

  const getOrCreateGainNode = useCallback(
    (soundId: string): GainNode | null => {
      if (!audioContext || !soundboardGainRef?.current) return null
      let gain = gainNodesRef.current.get(soundId)
      if (!gain) {
        gain = audioContext.createGain()
        gain.gain.value = 1
        const analyser = audioContext.createAnalyser()
        analyser.fftSize = 256
        analyser.smoothingTimeConstant = 0.8
        gain.connect(analyser)
        analyser.connect(soundboardGainRef.current)
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
        } else if (soundboardGainRef.current) {
          source.connect(soundboardGainRef.current)
        }
        source.onended = () => setPlayingSoundId((prev) => (prev === sound.id ? null : prev))
        setPlayingSoundId(sound.id)
        const offset = sound.startTime ?? 0
        const duration = sound.endTime != null ? sound.endTime - offset : undefined
        source.start(0, offset, duration)
      } catch (err) {
        console.error('Failed to play sound:', err)
      }
    },
    [audioContext, soundboardGainRef, getOrCreateGainNode]
  )

  const setSoundVolume = useCallback(
    (soundId: string, volume: number) => {
      const gain = getOrCreateGainNode(soundId)
      if (gain) gain.gain.value = volume
    },
    [getOrCreateGainNode]
  )

  const updateSound = useCallback((index: number, sound: Sound | null) => {
    setSoundboard((prev) => {
      const next = { ...prev, sounds: [...prev.sounds] }
      next.sounds[index] = sound
      return next
    })
  }, [])

  const updateSoundboard = useCallback((updates: Partial<Soundboard>) => {
    setSoundboard((prev) => ({ ...prev, ...updates }))
  }, [])

  const preloadSound = useCallback(
    async (sound: Sound) => {
      if (!audioContext || !sound?.audioBlob) return
      try {
        const arrayBuffer = await sound.audioBlob.arrayBuffer()
        const decoded = await audioContext.decodeAudioData(arrayBuffer)
        audioBuffersRef.current.set(sound.id, decoded)
      } catch (err) {
        console.error('Failed to preload sound:', err)
      }
    },
    [audioContext]
  )

  const preloadAll = useCallback(
    async (sounds: (Sound | null)[]) => {
      await Promise.all(sounds.filter((s): s is Sound => Boolean(s)).map((s) => preloadSound(s)))
    },
    [preloadSound]
  )

  const loadSoundboard = useCallback(
    (board: Soundboard) => {
      setSoundboard(board)
      gainNodesRef.current.clear()
      analyserNodesRef.current.clear()
      audioBuffersRef.current.clear()
      setLevelBySoundId({})
      if (audioContext && board?.sounds) {
        preloadAll(board.sounds)?.catch(console.error)
      }
    },
    [audioContext, preloadAll]
  )

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
  }, [])

  return {
    soundboard,
    setSoundboard,
    updateSound,
    updateSoundboard,
    playSound,
    playingSoundId,
    setSoundVolume,
    setPlayingSoundId,
    levelBySoundId,
    audioBuffersRef,
    gainNodesRef,
    preloadSound,
    preloadAll,
    loadSoundboard,
  }
}
