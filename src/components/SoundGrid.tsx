import { useCallback, useMemo, useState } from 'react'
import { SoundCell } from './SoundCell'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
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
  const [removeDialogIndex, setRemoveDialogIndex] = useState<number | null>(null)

  const keybindingsMap = useMemo(() => {
    const map: Record<string, string[]> = {}
    sounds.forEach((s) => {
      if (s?.keybindings?.length) map[s.id] = s.keybindings
    })
    return map
  }, [sounds])

  const handleRemoveClick = useCallback((index: number) => {
    setRemoveDialogIndex(index)
  }, [])

  const handleRemoveConfirm = useCallback(() => {
    if (removeDialogIndex === null) return
    updateSound(removeDialogIndex, null)
    setRemoveDialogIndex(null)
    toast.success('Clip removed')
  }, [removeDialogIndex, updateSound])

  const pendingRemoveSound = removeDialogIndex !== null ? sounds[removeDialogIndex] ?? null : null

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
          onRemove={handleRemoveClick}
        />
      ))}

      <Dialog open={removeDialogIndex !== null} onOpenChange={(open) => !open && setRemoveDialogIndex(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove clip</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Are you sure you want to remove &quot;{pendingRemoveSound?.name ?? 'this clip'}&quot;? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveDialogIndex(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemoveConfirm}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
