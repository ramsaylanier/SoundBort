import { useState, useEffect } from 'react'
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
import { Save, Trash2 } from 'lucide-react'
import { getAllSoundboards, saveSoundboard, deleteSoundboard } from '@/utils/soundboardStorage'
import { createEmptySoundboard } from '@/hooks/useSoundboard'
import { STORAGE_KEYS } from '@/constants'
import type { Soundboard } from '@/types'

interface SoundboardPickerProps {
  soundboard: Soundboard | null
  onLoad?: (board: Soundboard) => void
  onSave?: (board: Soundboard) => void
}

export function SoundboardPicker({
  soundboard,
  onLoad,
  onSave,
}: SoundboardPickerProps) {
  const [savedBoards, setSavedBoards] = useState<Soundboard[]>([])
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isCreatingNew, setIsCreatingNew] = useState(false)

  useEffect(() => {
    getAllSoundboards().then(setSavedBoards)
  }, [soundboard])

  const handleCreateNew = () => {
    const newBoard = createEmptySoundboard()
    onLoad?.(newBoard)
  }

  const handleLoad = (id: string) => {
    const board = savedBoards.find((b) => b.id === id)
    if (board) onLoad?.(board)
  }

  const handleSaveClick = () => {
    setIsCreatingNew(false)
    setSaveName(soundboard?.name || 'My Soundboard')
    setSaveDialogOpen(true)
  }

  const handleSaveConfirm = async () => {
    const name = saveName?.trim() || (isCreatingNew ? 'New Soundboard' : soundboard?.name)
    if (!name) return

    if (isCreatingNew) {
      const newBoard = createEmptySoundboard(name)
      await saveSoundboard(newBoard)
      localStorage.setItem(STORAGE_KEYS.ACTIVE_SOUNDBOARD_ID, newBoard.id)
      setSavedBoards((prev) => [...prev, newBoard])
      setSaveDialogOpen(false)
      setIsCreatingNew(false)
      onLoad?.(newBoard)
      onSave?.(newBoard)
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
      onSave?.(toSave)
    }
  }

  const selectValue =
    soundboard?.id && savedBoards.some((b) => b.id === soundboard.id)
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
            {savedBoards.map((b) => (
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
          <Input
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="Soundboard name"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveConfirm}>Save</Button>
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
