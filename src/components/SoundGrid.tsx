import { useCallback, useMemo } from 'react'
import { SoundCell } from './SoundCell'
import { useSoundboardStore } from '@/stores/useSoundboardStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useModalStore } from '@/stores/useModalStore'
import { toast } from 'sonner'
import type { Sound } from '@/types'

const EMPTY_SOUNDS: (import('@/types').Sound | null)[] = []

export function SoundGrid() {
  const soundsFromStore = useSoundboardStore((s) => s.soundboard.sounds)
  const sounds = useMemo(
    () => soundsFromStore ?? EMPTY_SOUNDS,
    [soundsFromStore]
  )
  const playingSoundId = useSoundboardStore((s) => s.playingSoundId)
  const playSound = useSoundboardStore((s) => s.playSound)
  const updateSound = useSoundboardStore((s) => s.updateSound)
  const levelBySoundId = useSoundboardStore((s) => s.levelBySoundId)
  const openRecordModal = useModalStore((s) => s.openRecordModal)
  const openKeybindModal = useModalStore((s) => s.openKeybindModal)
  const openClipEditModal = useModalStore((s) => s.openClipEditModal)
  const gridCols = useSettingsStore((s) => s.gridCols)

  const keybindingsMap = useMemo(() => {
    const map: Record<string, string[]> = {}
    sounds.forEach((s) => {
      if (s?.keybindings?.length) map[s.id] = s.keybindings
    })
    return map
  }, [sounds])

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

  return (
    <div
      className="grid gap-3 w-full max-w-4xl mx-auto h-full p-2"
      style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
    >
      {sounds.map((sound, index) => (
        <SoundCell
          key={sound?.id ?? `empty-${index}`}
          sound={sound}
          index={index}
          isPlaying={sound?.id === playingSoundId}
          keybindings={sound ? (keybindingsMap[sound.id] ?? []) : []}
          midiBindings={sound?.midiBindings ?? []}
          level={sound ? (levelBySoundId[sound.id] ?? 0) : 0}
          onPlay={(s) => playSound(s, s.volume ?? 1)}
          onUpload={handleUpload}
          onRecord={openRecordModal}
          onSetKeybind={openKeybindModal}
          onEditClip={openClipEditModal}
        />
      ))}
    </div>
  )
}
