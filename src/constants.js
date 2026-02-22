export const STORAGE_KEYS = {
  OUTPUT_DEVICE_ID: 'soundbort_output_device_id',
  INPUT_DEVICE_ID: 'soundbort_input_device_id',
  ACTIVE_SOUNDBOARD_ID: 'soundbort_active_soundboard_id',
}

export const ACCEPTED_AUDIO_FORMATS = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm']
export const ACCEPTED_AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.webm']
export const MAX_SOUND_FILE_SIZE_MB = 5
export const MAX_SOUND_FILE_SIZE_BYTES = MAX_SOUND_FILE_SIZE_MB * 1024 * 1024

export const DEFAULT_GRID_COLS = 4
export const DEFAULT_GRID_ROWS = 4
export const DEFAULT_GRID_SIZE = DEFAULT_GRID_COLS * DEFAULT_GRID_ROWS
