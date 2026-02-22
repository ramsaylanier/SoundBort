import { useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { keybindToString } from '@/utils/keybindUtils'
import { X } from 'lucide-react'

export function KeybindModal({
  open,
  onClose,
  soundName,
  onKeybind,
  onRemoveKeybind,
  existingKeybinds = [],
}) {
  const handleKeyDown = useCallback(
    (e) => {
      e.preventDefault()
      if (['Tab', 'Escape'].includes(e.key)) return
      const str = keybindToString(e)
      onKeybind?.(str)
    },
    [onKeybind]
  )

  useEffect(() => {
    if (open) {
      window.addEventListener('keydown', handleKeyDown, { capture: true })
      return () => window.removeEventListener('keydown', handleKeyDown, { capture: true })
    }
  }, [open, handleKeyDown])

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent onPointerDownOutside={onClose}>
        <DialogHeader>
          <DialogTitle>Set keybinding</DialogTitle>
          <DialogDescription>
            {soundName ? `Press a key for "${soundName}"` : 'Press a key'}
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Press any key or key combination (e.g. F1, Ctrl+1)
        </p>
        {existingKeybinds.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {existingKeybinds.map((k) => (
              <span
                key={k}
                className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded text-sm"
              >
                <kbd className="text-xs">{k}</kbd>
                <button
                  type="button"
                  onClick={() => onRemoveKeybind?.(k)}
                  className="p-0.5 rounded hover:bg-muted-foreground/20"
                  aria-label={`Remove ${k}`}
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
