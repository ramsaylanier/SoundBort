import { create } from 'zustand'
import { createEmptySoundboard } from '@/hooks/useSoundboard'
import type { Sound, Soundboard } from '@/types'

type PlaySoundFn = (sound: Sound, volume?: number) => void
type SetSoundVolumeFn = (soundId: string, volume: number) => void

interface SoundboardState {
  soundboard: Soundboard
  playingSoundId: string | null
  levelBySoundId: Record<string, number>
  _playSoundImpl: PlaySoundFn | null
  _setSoundVolumeImpl: SetSoundVolumeFn | null
  _loadSoundboardImpl: LoadSoundboardFn | null
}

type LoadSoundboardFn = (board: Soundboard) => void

interface SoundboardActions {
  updateSound: (index: number, sound: Sound | null) => void
  updateSoundboard: (updates: Partial<Soundboard>) => void
  loadSoundboard: (board: Soundboard) => void
  setPlayingSoundId: (id: string | null) => void
  setLevelBySoundId: (levels: Record<string, number>) => void
  playSound: (sound: Sound, volume?: number) => void
  setSoundVolume: (soundId: string, volume: number) => void
  registerSoundboardEngine: (play: PlaySoundFn, setVol: SetSoundVolumeFn, onLoad: LoadSoundboardFn) => void
}

export const useSoundboardStore = create<SoundboardState & SoundboardActions>((set, get) => ({
  soundboard: createEmptySoundboard(),
  playingSoundId: null,
  levelBySoundId: {},
  _playSoundImpl: null,
  _setSoundVolumeImpl: null,
  _loadSoundboardImpl: null,

  updateSound: (index, sound) =>
    set((state) => {
      const next = { ...state.soundboard, sounds: [...state.soundboard.sounds] }
      next.sounds[index] = sound
      return { soundboard: next }
    }),

  updateSoundboard: (updates) =>
    set((state) => ({ soundboard: { ...state.soundboard, ...updates } })),

  loadSoundboard: (board) => {
    set({ soundboard: board, levelBySoundId: {} })
    get()._loadSoundboardImpl?.(board)
  },

  setPlayingSoundId: (id) => set({ playingSoundId: id }),
  setLevelBySoundId: (levels) => set({ levelBySoundId: levels }),

  playSound: (sound, volume = 1) => {
    get()._playSoundImpl?.(sound, volume)
  },
  setSoundVolume: (soundId, volume) => {
    get()._setSoundVolumeImpl?.(soundId, volume)
  },

  registerSoundboardEngine: (play, setVol, onLoad) => {
    set({ _playSoundImpl: play, _setSoundVolumeImpl: setVol, _loadSoundboardImpl: onLoad })
  },
}))
