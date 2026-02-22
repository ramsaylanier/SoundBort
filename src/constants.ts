export const STORAGE_KEYS = {
  OUTPUT_DEVICE_ID: 'soundbort_output_device_id',
  INPUT_DEVICE_ID: 'soundbort_input_device_id',
  ACTIVE_SOUNDBOARD_ID: 'soundbort_active_soundboard_id',
  MIDI_ENABLED: 'soundbort_midi_enabled',
  GRID_ROWS: 'soundbort_grid_rows',
  GRID_COLS: 'soundbort_grid_cols',
} as const

export const ACCEPTED_AUDIO_FORMATS = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'] as const
export const ACCEPTED_AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.webm'] as const
export const MAX_SOUND_FILE_SIZE_MB = 5
export const MAX_SOUND_FILE_SIZE_BYTES = MAX_SOUND_FILE_SIZE_MB * 1024 * 1024

export const DEFAULT_GRID_COLS = 4
export const DEFAULT_GRID_ROWS = 4
export const DEFAULT_GRID_SIZE = DEFAULT_GRID_COLS * DEFAULT_GRID_ROWS
export const MIN_GRID = 2
export const MAX_GRID = 8

export interface GridSize {
  rows: number
  cols: number
}

export function getStoredGridSize(): GridSize {
  const rows = parseInt(localStorage.getItem(STORAGE_KEYS.GRID_ROWS) ?? '', 10)
  const cols = parseInt(localStorage.getItem(STORAGE_KEYS.GRID_COLS) ?? '', 10)
  const r = Number.isFinite(rows) && rows >= MIN_GRID && rows <= MAX_GRID ? rows : DEFAULT_GRID_ROWS
  const c = Number.isFinite(cols) && cols >= MIN_GRID && cols <= MAX_GRID ? cols : DEFAULT_GRID_COLS
  return { rows: r, cols: c }
}
