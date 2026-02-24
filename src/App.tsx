import { useCallback, useMemo, useEffect } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { getSoundboard } from '@/utils/soundboardStorage'
import { STORAGE_KEYS, getStoredGridSize } from '@/constants'
import { Button } from '@/components/ui/button'
import { Mixer } from '@/components/Mixer'
import { SoundboardPicker } from '@/components/SoundboardPicker'
import { SoundGrid } from '@/components/SoundGrid'
import { BindModal } from '@/components/BindModal'
import { RecordModal } from '@/components/RecordModal'
import { ClipEditModal } from '@/components/ClipEditModal'
import { SettingsModal } from '@/components/SettingsModal'
import { useAudioDeviceStore } from '@/stores/useAudioDeviceStore'
import { useSoundboardStore } from '@/stores/useSoundboardStore'
import { useModalStore } from '@/stores/useModalStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useKeyboardBindings } from '@/hooks/useKeyboardBindings'
import { useMIDIAccess } from '@/hooks/useMIDIAccess'
import { useMIDIBindings } from '@/hooks/useMIDIBindings'
import { toast } from 'sonner'
import { Settings } from 'lucide-react'
import type { Sound, Soundboard, MidiBinding } from '@/types'

function App() {
  const error = useAudioDeviceStore((s) => s.error)
  const setMixerLevels = useAudioDeviceStore((s) => s.setMixerLevels)

  const currentSoundboard = useSoundboardStore((s) => s.soundboard)
  const playSound = useSoundboardStore((s) => s.playSound)
  const loadSoundboard = useSoundboardStore((s) => s.loadSoundboard)

  const keybindModalCell = useModalStore((s) => s.keybindModalCell)
  const openSettings = useModalStore((s) => s.openSettings)

  const gridRows = useSettingsStore((s) => s.gridRows)
  const gridCols = useSettingsStore((s) => s.gridCols)
  const midiEnabled = useSettingsStore((s) => s.midiEnabled)
  const defaultMidiDeviceId = useSettingsStore((s) => s.defaultMidiDeviceId)

  useEffect(() => {
    if (error) toast.error(error)
  }, [error])

  const keybindingsMap = useMemo(() => {
    const map: Record<string, string[]> = {}
    currentSoundboard?.sounds?.forEach((s) => {
      if (s?.keybindings?.length) map[s.id] = s.keybindings
    })
    return map
  }, [currentSoundboard])

  const midiBindingsMap = useMemo(() => {
    const map: Record<string, MidiBinding[]> = {}
    currentSoundboard?.sounds?.forEach((s) => {
      if (s?.midiBindings?.length) map[s.id] = s.midiBindings
    })
    return map
  }, [currentSoundboard])

  const { midiAccess } = useMIDIAccess(midiEnabled)
  const handleKeybindTrigger = useCallback(
    (soundId: string) => {
      const sound = currentSoundboard?.sounds?.find((s) => s?.id === soundId)
      if (sound) playSound(sound, sound.volume ?? 1)
    },
    [currentSoundboard, playSound]
  )

  useKeyboardBindings(keybindingsMap, handleKeybindTrigger, !!currentSoundboard)
  useMIDIBindings(
    midiAccess,
    midiBindingsMap,
    handleKeybindTrigger,
    !!currentSoundboard && midiEnabled,
    defaultMidiDeviceId || undefined,
    keybindModalCell != null
  )

  const resizeSoundsToGrid = useCallback(
    (sounds: (Sound | null)[] | undefined, rows: number, cols: number): (Sound | null)[] => {
      const newSize = rows * cols
      const current = sounds ?? []
      if (current.length > newSize) return current.slice(0, newSize)
      if (current.length < newSize) return [...current, ...Array(newSize - current.length).fill(null)]
      return current
    },
    []
  )

  const handleLoadSoundboard = useCallback(
    (board: Soundboard) => {
      const resized = {
        ...board,
        sounds: resizeSoundsToGrid(board?.sounds, gridRows, gridCols),
      }
      loadSoundboard(resized)
      if (board?.mixer) {
        setMixerLevels((prev) => ({ ...prev, ...board.mixer }))
      }
      if (board?.id) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_SOUNDBOARD_ID, board.id)
      }
    },
    [loadSoundboard, setMixerLevels, gridRows, gridCols, resizeSoundsToGrid]
  )

  useEffect(() => {
    const activeId = localStorage.getItem(STORAGE_KEYS.ACTIVE_SOUNDBOARD_ID)
    if (!activeId) return
    getSoundboard(activeId).then((board) => {
      if (!board) return
      const { rows, cols } = getStoredGridSize()
      const newSize = rows * cols
      const sounds = board.sounds ?? []
      const resized =
        sounds.length > newSize
          ? sounds.slice(0, newSize)
          : sounds.length < newSize
            ? [...sounds, ...Array(newSize - sounds.length).fill(null)]
            : sounds
      loadSoundboard({ ...board, sounds: resized })
      if (board.mixer) setMixerLevels((prev) => ({ ...prev, ...board.mixer }))
      localStorage.setItem(STORAGE_KEYS.ACTIVE_SOUNDBOARD_ID, board.id)
    })
  }, [loadSoundboard, setMixerLevels])

  return (
    <div className="bg-background">
      <div className="h-[100vh] grid grid-cols-1 grid-rows-[auto_1fr] overflow-hidden">
        <header className="flex flex-wrap items-center justify-between gap-4 p-2 border-b">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">SoundBort</h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={openSettings}
              title="Settings"
              aria-label="Settings"
            >
              <Settings className="size-5" />
            </Button>
          </div>
          <SoundboardPicker onLoad={handleLoadSoundboard} onSave={() => {}} />
          <Mixer />
        </header>

        <main className="h-full overflow-hidden">
          <SoundGrid />
        </main>
      </div>

      <BindModal />

      <ClipEditModal />

      <SettingsModal />

      <RecordModal />

      <Toaster />
    </div>
  )
}

export default App
