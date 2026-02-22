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
import { Plus, Save } from 'lucide-react'
import { getAllSoundboards, saveSoundboard } from '@/utils/soundboardStorage'
import { createEmptySoundboard } from '@/hooks/useSoundboard'
import { STORAGE_KEYS } from '@/constants'

export function SoundboardPicker({
  soundboard,
  onLoad,
  onSave,
}) {
  const [savedBoards, setSavedBoards] = useState([])
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [saveName, setSaveName] = useState('')

  useEffect(() => {
    getAllSoundboards().then(setSavedBoards)
  }, [soundboard])

  const handleCreateNew = () => {
    const newBoard = createEmptySoundboard()
    onLoad?.(newBoard)
  }

  const handleLoad = (id) => {
    const board = savedBoards.find((b) => b.id === id)
    if (board) onLoad?.(board)
  }

  const handleSaveClick = () => {
    setSaveName(soundboard?.name || 'My Soundboard')
    setSaveDialogOpen(true)
  }

  const handleSaveConfirm = async () => {
    if (!soundboard) return
    const toSave = { ...soundboard, name: saveName || soundboard.name }
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

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="outline" size="sm" onClick={handleCreateNew} className="gap-2">
        <Plus className="size-4" />
        New
      </Button>
      <Select
        value={soundboard?.id ?? ''}
        onValueChange={handleLoad}
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

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save soundboard</DialogTitle>
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
    </div>
  )
}
