import { create } from 'zustand'
import { STORAGE_KEYS, MIN_GRID, MAX_GRID, getStoredGridSize } from '@/constants'

interface SettingsState {
  gridRows: number
  gridCols: number
  midiEnabled: boolean
  defaultMidiDeviceId: string
}

interface SettingsActions {
  setGrid: (rows: number, cols: number) => void
  setMidiEnabled: (enabled: boolean) => void
  setDefaultMidiDeviceId: (id: string) => void
}

function getInitialState(): SettingsState {
  const { rows, cols } = getStoredGridSize()
  return {
    gridRows: rows,
    gridCols: cols,
    midiEnabled: localStorage.getItem(STORAGE_KEYS.MIDI_ENABLED) === 'true',
    defaultMidiDeviceId: localStorage.getItem(STORAGE_KEYS.MIDI_DEFAULT_DEVICE_ID) ?? '',
  }
}

export const useSettingsStore = create<SettingsState & SettingsActions>((set) => ({
  ...getInitialState(),

  setGrid: (rows, cols) => {
    const r = Math.min(MAX_GRID, Math.max(MIN_GRID, rows))
    const c = Math.min(MAX_GRID, Math.max(MIN_GRID, cols))
    localStorage.setItem(STORAGE_KEYS.GRID_ROWS, String(r))
    localStorage.setItem(STORAGE_KEYS.GRID_COLS, String(c))
    set({ gridRows: r, gridCols: c })
  },
  setMidiEnabled: (enabled) => {
    localStorage.setItem(STORAGE_KEYS.MIDI_ENABLED, String(enabled))
    set({ midiEnabled: enabled })
  },
  setDefaultMidiDeviceId: (id) => {
    localStorage.setItem(STORAGE_KEYS.MIDI_DEFAULT_DEVICE_ID, id)
    set({ defaultMidiDeviceId: id })
  },
}))
