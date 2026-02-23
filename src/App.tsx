import { useCallback, useMemo, useState, useEffect } from 'react'
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
import { useAudioDeviceContext } from '@/contexts/AudioDeviceContext'
import { useSoundboard } from '@/hooks/useSoundboard'
import { useKeyboardBindings } from '@/hooks/useKeyboardBindings'
import { useMIDIAccess } from '@/hooks/useMIDIAccess'
import { useMIDIBindings } from '@/hooks/useMIDIBindings'
import { toast } from 'sonner'
import { noteNumberToName, midiBindingsConflict } from '@/utils/midiUtils'
import { Settings } from 'lucide-react'
import type { Sound, Soundboard, MidiBinding } from '@/types'

function App() {
  const audio = useAudioDeviceContext()
  const {
    audioContext,
    soundboardGainRef,
    mixerLevels,
    setMixerLevels,
  } = audio

  const soundboard = useSoundboard(audioContext, soundboardGainRef)
  const {
    soundboard: currentSoundboard,
    updateSound,
    updateSoundboard,
    playSound,
    playingSoundId,
    setSoundVolume,
    loadSoundboard,
    levelBySoundId,
  } = soundboard

  const [keybindModalCell, setKeybindModalCell] = useState<number | null>(null)
  const [recordModalCell, setRecordModalCell] = useState<number | null>(null)
  const [clipEditModalCell, setClipEditModalCell] = useState<number | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const [gridState, setGridState] = useState(getStoredGridSize)
  const { rows: gridRows, cols: gridCols } = gridState
  const [midiEnabled, setMidiEnabled] = useState(
    () => localStorage.getItem(STORAGE_KEYS.MIDI_ENABLED) === 'true'
  )
  const [defaultMidiDeviceId, setDefaultMidiDeviceId] = useState(
    () => localStorage.getItem(STORAGE_KEYS.MIDI_DEFAULT_DEVICE_ID) ?? ''
  )

  useEffect(() => {
    if (audio.error) toast.error(audio.error)
  }, [audio.error])

  const keybindingsMap = useMemo(() => {
    console.log(currentSoundboard?.sounds)
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
  const midiDevices = useMemo(() => {
    if (!midiAccess?.inputs) return []
    return Array.from(midiAccess.inputs.values()).map((input) => ({
      id: input.id,
      name: input.name || input.id,
    }))
  }, [midiAccess])
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

  const handleUpload = useCallback(
    (index: number, file: File) => {
      const sound: Sound = {
        id: crypto.randomUUID(),
        name: file.name.replace(/\.[^/.]+$/, ''),
        audioBlob: file,
        keybindings: [],
        midiBindings: [],
        volume: 1,
        startTime: 0,
        endTime: null,
      }
      updateSound(index, sound)
      toast.success(`Added "${sound.name}"`)
    },
    [updateSound]
  )

  const handleRecordComplete = useCallback(
    (index: number, blob: Blob, suggestedName: string) => {
      const sound: Sound = {
        id: crypto.randomUUID(),
        name: suggestedName || `Recording ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        audioBlob: blob,
        keybindings: [],
        midiBindings: [],
        volume: 1,
        startTime: 0,
        endTime: null,
      }
      updateSound(index, sound)
      toast.success(`Added "${sound.name}"`)
      setRecordModalCell(null)
    },
    [updateSound]
  )

  const handleSetKeybind = useCallback((index: number) => {
    setKeybindModalCell(index)
  }, [])

  const handleKeybindSet = useCallback(
    (keybind: string) => {
      if (keybindModalCell == null) return
      const sound = currentSoundboard?.sounds?.[keybindModalCell]
      if (!sound) return
      if (sound.keybindings?.includes(keybind)) {
        toast.info('Key already bound to this sound')
        return
      }
      const conflict = Object.entries(keybindingsMap).find(
        ([id, bindings]) => id !== sound.id && bindings?.includes(keybind)
      )
      if (conflict) {
        const [conflictSoundId] = conflict
        const conflictSound = currentSoundboard?.sounds?.find((s) => s?.id === conflictSoundId)
        toast.error(
          `"${keybind}" is already bound to "${conflictSound?.name ?? 'another sound'}". Choose a different key.`
        )
        return
      }
      updateSound(keybindModalCell, { ...sound, keybindings: [keybind] })
      toast.success(`Bound ${keybind}`)
    },
    [keybindModalCell, currentSoundboard, keybindingsMap, updateSound]
  )

  const handleRemoveKeybind = useCallback(
    (keybind: string) => {
      if (keybindModalCell == null) return
      const sound = currentSoundboard?.sounds?.[keybindModalCell]
      if (!sound) return
      updateSound(keybindModalCell, { ...sound, keybindings: [] })
      toast.success(`Removed ${keybind}`)
    },
    [keybindModalCell, currentSoundboard, updateSound]
  )

  const handleMIDIBindSet = useCallback(
    (binding: MidiBinding) => {
      if (keybindModalCell == null) return
      const sound = currentSoundboard?.sounds?.[keybindModalCell]
      if (!sound) return
      const existing = sound.midiBindings ?? []
      if (existing.some((b) => midiBindingsConflict(binding, b))) {
        toast.info('MIDI note already bound to this sound')
        return
      }
      const conflict = Object.entries(midiBindingsMap).find(
        ([id, bindings]) =>
          id !== sound.id &&
          bindings?.some((b) => midiBindingsConflict(binding, b))
      )
      if (conflict) {
        const [conflictSoundId] = conflict
        const conflictSound = currentSoundboard?.sounds?.find((s) => s?.id === conflictSoundId)
        toast.error(
          `This note is already bound to "${conflictSound?.name ?? 'another sound'}". Choose a different note.`
        )
        return
      }
      updateSound(keybindModalCell, { ...sound, midiBindings: [binding] })
      toast.success(`Bound ${noteNumberToName(binding.note)}`)
    },
    [keybindModalCell, currentSoundboard, midiBindingsMap, updateSound]
  )

  const handleRemoveMIDIBind = useCallback(
    (binding: MidiBinding) => {
      if (keybindModalCell == null) return
      const sound = currentSoundboard?.sounds?.[keybindModalCell]
      if (!sound) return
      updateSound(keybindModalCell, { ...sound, midiBindings: [] })
      toast.success(`Removed ${noteNumberToName(binding.note)}`)
    },
    [keybindModalCell, currentSoundboard, updateSound]
  )

  const handleEditClip = useCallback((index: number) => {
    setClipEditModalCell(index)
  }, [])

  const handleClipEditSave = useCallback(
    (startTime: number, endTime: number, name?: string) => {
      if (clipEditModalCell == null) return
      const sound = currentSoundboard?.sounds?.[clipEditModalCell]
      if (!sound) return
      updateSound(clipEditModalCell, {
        ...sound,
        startTime,
        endTime,
        ...(name != null && { name }),
      })
      toast.success('Clip updated')
      setClipEditModalCell(null)
    },
    [clipEditModalCell, currentSoundboard, updateSound]
  )

  const handleSoundVolumeChange = useCallback(
    (soundId: string, volume: number) => {
      if (!currentSoundboard?.sounds) return
      updateSoundboard({
        sounds: currentSoundboard.sounds.map((s) =>
          s?.id === soundId ? { ...s, volume } : s
        ),
      })
    },
    [currentSoundboard, updateSoundboard]
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

  const handleGridChange = useCallback(
    (rows: number, cols: number) => {
      setGridState({ rows, cols })
      const newSize = rows * cols
      const currentSounds = currentSoundboard?.sounds ?? []
      let newSounds: (Sound | null)[]
      if (currentSounds.length > newSize) {
        newSounds = currentSounds.slice(0, newSize)
      } else if (currentSounds.length < newSize) {
        newSounds = [...currentSounds, ...Array(newSize - currentSounds.length).fill(null)]
      } else {
        return
      }
      updateSoundboard({ sounds: newSounds })
    },
    [currentSoundboard, updateSoundboard]
  )

  const handleLoadSoundboard = useCallback(
    (board: Soundboard) => {
      const { rows, cols } = gridState
      const resized = {
        ...board,
        sounds: resizeSoundsToGrid(board?.sounds, rows, cols),
      }
      loadSoundboard(resized)
      if (board?.mixer) {
        setMixerLevels((prev) => ({ ...prev, ...board.mixer }))
      }
      if (board?.id) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_SOUNDBOARD_ID, board.id)
      }
    },
    [loadSoundboard, setMixerLevels, gridState, resizeSoundsToGrid]
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

  const modalSound = keybindModalCell != null ? currentSoundboard?.sounds?.[keybindModalCell] ?? null : null
  const clipEditSound = clipEditModalCell != null ? currentSoundboard?.sounds?.[clipEditModalCell] ?? null : null

  return (
    <div className="bg-background">
      <div className="h-[100vh] grid grid-cols-1 grid-rows-[auto_1fr] overflow-hidden">
        <header className="flex flex-wrap items-center justify-between gap-4 p-2 border-b">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">SoundBort</h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSettingsOpen(true)}
              title="Settings"
              aria-label="Settings"
            >
              <Settings className="size-5" />
            </Button>
          </div>
          <SoundboardPicker
            soundboard={
              currentSoundboard
                ? { ...currentSoundboard, mixer: mixerLevels }
                : null
            }
            onLoad={handleLoadSoundboard}
            onSave={() => { }}
          />
          <Mixer
            mixerLevels={mixerLevels}
            setMixerLevels={setMixerLevels}
            sounds={currentSoundboard?.sounds}
            setSoundVolume={setSoundVolume}
            onSoundVolumeChange={handleSoundVolumeChange}
            levelBySoundId={levelBySoundId}
          />
        </header>

        <main className="h-full overflow-hidden">
          <SoundGrid
            sounds={currentSoundboard?.sounds ?? []}
            gridCols={gridCols}
            playingSoundId={playingSoundId}
            keybindingsMap={keybindingsMap}
            levelBySoundId={levelBySoundId}
            onPlay={(s) => playSound(s, s.volume ?? 1)}
            onUpload={handleUpload}
            onRecord={(index) => setRecordModalCell(index)}
            onSetKeybind={handleSetKeybind}
            onEditClip={handleEditClip}
          />
        </main>
      </div>

      <BindModal
        open={keybindModalCell != null}
        onClose={() => setKeybindModalCell(null)}
        soundName={modalSound?.name}
        onKeybind={handleKeybindSet}
        onRemoveKeybind={handleRemoveKeybind}
        existingKeybinds={modalSound?.keybindings ?? []}
        onMIDIBind={handleMIDIBindSet}
        onRemoveMIDIBind={handleRemoveMIDIBind}
        existingMIDIBinds={modalSound?.midiBindings ?? []}
        midiEnabled={midiEnabled}
        midiDevices={midiDevices}
        defaultMidiDeviceId={defaultMidiDeviceId}
        midiAccess={midiAccess}
      />

      <ClipEditModal
        open={clipEditModalCell != null}
        onClose={() => setClipEditModalCell(null)}
        sound={clipEditSound}
        onSave={handleClipEditSave}
      />

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        gridRows={gridRows}
        gridCols={gridCols}
        onGridChange={handleGridChange}
        midiEnabled={midiEnabled}
        onMidiEnabledChange={setMidiEnabled}
        midiDevices={midiDevices}
        defaultMidiDeviceId={defaultMidiDeviceId}
        onDefaultMidiDeviceChange={(id) => {
          setDefaultMidiDeviceId(id)
          localStorage.setItem(STORAGE_KEYS.MIDI_DEFAULT_DEVICE_ID, id)
        }}
      />

      <RecordModal
        open={recordModalCell != null}
        onClose={() => setRecordModalCell(null)}
        onRecordComplete={(blob, suggestedName) =>
          recordModalCell != null && handleRecordComplete(recordModalCell, blob, suggestedName)
        }
      />

      <Toaster />
    </div>
  )
}

export default App
