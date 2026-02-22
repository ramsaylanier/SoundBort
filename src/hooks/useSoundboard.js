import { useState, useCallback, useRef, useEffect } from 'react'
import { DEFAULT_GRID_SIZE, getStoredGridSize } from '@/constants'

export function createEmptySoundboard(name = 'New Soundboard', gridSize) {
  const size =
    gridSize ?? (() => {
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

export function useSoundboard(audioContext, soundboardGainRef) {
  const [soundboard, setSoundboard] = useState(() => createEmptySoundboard())
  const [playingSoundId, setPlayingSoundId] = useState(null)
  const [levelBySoundId, setLevelBySoundId] = useState({})
  const audioBuffersRef = useRef(new Map())
  const gainNodesRef = useRef(new Map())
  const analyserNodesRef = useRef(new Map())

  const getOrCreateGainNode = useCallback(
    (soundId) => {
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
    async (sound, volume = 1) => {
      if (!audioContext || !sound?.audioBlob) return
      try {
        const buffer = audioBuffersRef.current.get(sound.id)
        if (!buffer) {
          const arrayBuffer = await sound.audioBlob.arrayBuffer()
          const decoded = await audioContext.decodeAudioData(arrayBuffer)
          audioBuffersRef.current.set(sound.id, decoded)
        }
        const buf = audioBuffersRef.current.get(sound.id)
        const source = audioContext.createBufferSource()
        source.buffer = buf
        const gain = getOrCreateGainNode(sound.id)
        if (gain) {
          gain.gain.value = volume
          source.connect(gain)
        } else {
          source.connect(soundboardGainRef.current)
        }
        source.onended = () => setPlayingSoundId((prev) => (prev === sound.id ? null : prev))
        setPlayingSoundId(sound.id)
        const offset = sound.startTime ?? 0
        const duration =
          sound.endTime != null ? sound.endTime - offset : undefined
        source.start(0, offset, duration)
      } catch (err) {
        console.error('Failed to play sound:', err)
      }
    },
    [audioContext, soundboardGainRef, getOrCreateGainNode]
  )

  const setSoundVolume = useCallback(
    (soundId, volume) => {
      const gain = getOrCreateGainNode(soundId)
      if (gain) gain.gain.value = volume
    },
    [getOrCreateGainNode]
  )

  const updateSound = useCallback((index, sound) => {
    setSoundboard((prev) => {
      const next = { ...prev, sounds: [...prev.sounds] }
      next.sounds[index] = sound
      return next
    })
  }, [])

  const updateSoundboard = useCallback((updates) => {
    setSoundboard((prev) => ({ ...prev, ...updates }))
  }, [])

  const preloadSound = useCallback(
    async (sound) => {
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
    async (sounds) => {
      await Promise.all(sounds.filter(Boolean).map((s) => preloadSound(s)))
    },
    [preloadSound]
  )

  const loadSoundboard = useCallback((board) => {
    setSoundboard(board)
    gainNodesRef.current.clear()
    analyserNodesRef.current.clear()
    audioBuffersRef.current.clear()
    setLevelBySoundId({})
    if (audioContext && board?.sounds) {
      preloadAll(board.sounds)?.catch(console.error)
    }
  }, [audioContext, preloadAll])

  // Poll per-sound analysers for level metering
  useEffect(() => {
    let rafId
    const dataArrays = new Map()

    function tick() {
      const levels = {}
      for (const [soundId, analyser] of analyserNodesRef.current) {
        if (!dataArrays.has(soundId)) {
          dataArrays.set(soundId, new Uint8Array(analyser.frequencyBinCount))
        }
        const dataArray = dataArrays.get(soundId)
        analyser.getByteFrequencyData(dataArray)
        let sum = 0
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i] * dataArray[i]
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
