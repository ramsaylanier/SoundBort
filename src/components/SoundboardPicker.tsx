import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Plus, Save, Trash2 } from 'lucide-react'
import { getAllSoundboards, saveSoundboard, deleteSoundboard } from '@/utils/soundboardStorage'
import { createEmptySoundboard } from '@/hooks/useSoundboard'
import { STORAGE_KEYS } from '@/constants'
import { useSoundboardStore } from '@/stores/useSoundboardStore'
import { useAudioDeviceStore } from '@/stores/useAudioDeviceStore'
import type { Soundboard } from '@/types'

interface SoundboardPickerProps {
  onLoad?: (board: Soundboard) => void
}

export function SoundboardPicker({
  onLoad,
}: SoundboardPickerProps) {
  const soundboardFromStore = useSoundboardStore((s) => s.soundboard)
  const mixerLevels = useAudioDeviceStore((s) => s.mixerLevels)
  const soundboard = useMemo(
    () =>
      soundboardFromStore
        ? { ...soundboardFromStore, mixer: mixerLevels }
        : null,
    [soundboardFromStore, mixerLevels]
  )
  const [savedBoards, setSavedBoards] = useState<Soundboard[]>([])
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  useEffect(() => {
    getAllSoundboards().then(setSavedBoards)
  }, [soundboard])

  const handleCreateNew = () => {
    setIsCreatingNew(true)
    setSaveName('New Soundboard')
    setSaveDialogOpen(true)
  }

  const boardsForSelect = useMemo(() => {
    if (!soundboard?.id) return savedBoards
    const inSaved = savedBoards.some((b) => b.id === soundboard.id)
    if (inSaved) return savedBoards
    return [soundboard, ...savedBoards]
  }, [soundboard, savedBoards])

  const handleLoad = (id: string) => {
    const board = savedBoards.find((b) => b.id === id) ?? (id === soundboard?.id ? soundboard : null)
    if (board) onLoad?.(board)
  }

  const handleSaveClick = () => {
    setIsCreatingNew(false)
    setSaveName(soundboard?.name || 'My Soundboard')
    setSaveDialogOpen(true)
  }

  const trimmedName = saveName?.trim() ?? ''
  const isNameValid = trimmedName.length > 0
  const isNameUnique = useMemo(() => {
    if (!isNameValid) return true
    const lower = trimmedName.toLowerCase()
    if (isCreatingNew) {
      return !savedBoards.some((b) => b.name.trim().toLowerCase() === lower)
    }
    return !savedBoards.some(
      (b) => b.id !== soundboard?.id && b.name.trim().toLowerCase() === lower
    )
  }, [trimmedName, isNameValid, isCreatingNew, savedBoards, soundboard?.id])

  const canSave = isNameValid && isNameUnique

  const handleSaveConfirm = async () => {
    const name = trimmedName || (isCreatingNew ? 'New Soundboard' : soundboard?.name)
    if (!name || !canSave) return

    if (isCreatingNew) {
      const newBoard = createEmptySoundboard(name)
      await saveSoundboard(newBoard)
      localStorage.setItem(STORAGE_KEYS.ACTIVE_SOUNDBOARD_ID, newBoard.id)
      setSavedBoards((prev) => [...prev, newBoard])
      setSaveDialogOpen(false)
      setIsCreatingNew(false)
      onLoad?.(newBoard)
    } else {
      if (!soundboard) return
      const toSave = { ...soundboard, name }
      await saveSoundboard(toSave)
      localStorage.setItem(STORAGE_KEYS.ACTIVE_SOUNDBOARD_ID, toSave.id)
      setSavedBoards((prev) => {
        const idx = prev.findIndex((b) => b.id === toSave.id)
        const next = [...prev]
        if (idx >= 0) next[idx] = toSave
        else next.push(toSave)
        return next
      })
      setSaveDialogOpen(false)
    }
  }

  const selectValue =
    soundboard?.id && boardsForSelect.some((b) => b.id === soundboard.id)
      ? soundboard.id
      : ''

  const handleSelectChange = (value: string) => {
    if (value) handleLoad(value)
  }

  const canDelete = soundboard?.id && savedBoards.some((b) => b.id === soundboard.id)

  const handleDeleteClick = () => setDeleteDialogOpen(true)

  const handleDeleteConfirm = async () => {
    if (!soundboard?.id) return
    const deletedId = soundboard.id
    await deleteSoundboard(deletedId)
    setSavedBoards((prev) => prev.filter((b) => b.id !== deletedId))
    setDeleteDialogOpen(false)
    if (localStorage.getItem(STORAGE_KEYS.ACTIVE_SOUNDBOARD_ID) === deletedId) {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_SOUNDBOARD_ID)
      const remaining = savedBoards.filter((b) => b.id !== deletedId)
      if (remaining.length > 0) {
        onLoad?.(remaining[0]!)
      } else {
        handleCreateNew()
      }
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex flex-col gap-2">
        <Select
          value={selectValue || undefined}
          onValueChange={handleSelectChange}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Load soundboard" />
          </SelectTrigger>
          <SelectContent>
            {boardsForSelect.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={handleSaveClick}
        disabled={!soundboard}
        className="gap-2"
      >
        <Save className="size-4" />
        Save
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleCreateNew}
        className="gap-2"
        title="Create new soundboard"
      >
        <Plus className="size-4" />
        New
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleDeleteClick}
        disabled={!canDelete}
        className="gap-2 text-destructive hover:text-destructive"
        title="Delete soundboard"
      >
        <Trash2 className="size-4" />
        Delete
      </Button>

      <Dialog
        open={saveDialogOpen}
        onOpenChange={(open) => {
          setSaveDialogOpen(open)
          if (!open) setIsCreatingNew(false)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isCreatingNew ? 'New soundboard' : 'Save soundboard'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            <Input
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Soundboard name"
              aria-invalid={!isNameValid || !isNameUnique}
            />
            {!isNameValid && (
              <p className="text-sm text-destructive">Name is required</p>
            )}
            {isNameValid && !isNameUnique && (
              <p className="text-sm text-destructive">A soundboard with this name already exists</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveConfirm} disabled={!canSave}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete soundboard</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Are you sure you want to delete &quot;{soundboard?.name}&quot;? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
