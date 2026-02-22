import { useCallback, useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { STORAGE_KEYS, MIN_GRID, MAX_GRID, getStoredGridSize } from '@/constants'
import { cn } from '@/lib/utils'

const midiSupported = typeof navigator !== 'undefined' && !!navigator.requestMIDIAccess

interface SettingsModalProps {
  open: boolean
  onClose: () => void
  gridRows: number
  gridCols: number
  onGridChange: (rows: number, cols: number) => void
  midiEnabled: boolean
  onMidiEnabledChange: (enabled: boolean) => void
}

export function SettingsModal({
  open,
  onClose,
  gridRows,
  gridCols,
  onGridChange,
  midiEnabled,
  onMidiEnabledChange,
}: SettingsModalProps) {
  const [localRows, setLocalRows] = useState(() => gridRows ?? getStoredGridSize().rows)
  const [localCols, setLocalCols] = useState(() => gridCols ?? getStoredGridSize().cols)
  const [midiError, setMidiError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      queueMicrotask(() => {
        setLocalRows(gridRows ?? getStoredGridSize().rows)
        setLocalCols(gridCols ?? getStoredGridSize().cols)
      })
    }
  }, [open, gridRows, gridCols])

  const handleMidiToggle = useCallback(async () => {
    if (!midiSupported) return
    const next = !midiEnabled
    if (next) {
      try {
        await navigator.requestMIDIAccess()
        setMidiError(null)
        onMidiEnabledChange?.(true)
        localStorage.setItem(STORAGE_KEYS.MIDI_ENABLED, 'true')
      } catch (err) {
        setMidiError((err as Error).message ?? 'Failed to access MIDI')
      }
    } else {
      onMidiEnabledChange?.(false)
      localStorage.setItem(STORAGE_KEYS.MIDI_ENABLED, 'false')
      setMidiError(null)
    }
  }, [midiEnabled, onMidiEnabledChange])

  const applyGrid = useCallback(
    (rows: number, cols: number) => {
      const r = Math.min(MAX_GRID, Math.max(MIN_GRID, rows))
      const c = Math.min(MAX_GRID, Math.max(MIN_GRID, cols))
      setLocalRows(r)
      setLocalCols(c)
      localStorage.setItem(STORAGE_KEYS.GRID_ROWS, String(r))
      localStorage.setItem(STORAGE_KEYS.GRID_COLS, String(c))
      onGridChange?.(r, c)
    },
    [onGridChange]
  )

  const handleRowsBlur = useCallback(() => {
    applyGrid(localRows, localCols)
  }, [localRows, localCols, applyGrid])

  const handleColsBlur = useCallback(() => {
    applyGrid(localRows, localCols)
  }, [localRows, localCols, applyGrid])

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent onPointerDownOutside={onClose}>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Configure MIDI and grid layout.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">MIDI</h4>
            {midiSupported ? (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={midiEnabled}
                  onClick={handleMidiToggle}
                  className={cn(
                    'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    midiEnabled ? 'bg-primary' : 'bg-muted'
                  )}
                >
                  <span
                    className={cn(
                      'pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform',
                      midiEnabled ? 'translate-x-6' : 'translate-x-1'
                    )}
                  />
                </button>
                <span className="text-sm text-muted-foreground">
                  {midiEnabled ? 'MIDI enabled' : 'MIDI disabled'}
                </span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">MIDI is not supported in this browser.</p>
            )}
            {midiError && (
              <p className="text-sm text-destructive" role="alert">
                {midiError}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Grid layout (H × W)</h4>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label htmlFor="grid-rows" className="text-sm font-medium">
                  Rows
                </label>
                <Input
                  id="grid-rows"
                  type="number"
                  min={MIN_GRID}
                  max={MAX_GRID}
                  value={localRows}
                  onChange={(e) => setLocalRows(parseInt(e.target.value, 10) || MIN_GRID)}
                  onBlur={handleRowsBlur}
                  className="w-16"
                />
              </div>
              <span className="text-muted-foreground">×</span>
              <div className="flex items-center gap-2">
                <label htmlFor="grid-cols" className="text-sm font-medium">
                  Cols
                </label>
                <Input
                  id="grid-cols"
                  type="number"
                  min={MIN_GRID}
                  max={MAX_GRID}
                  value={localCols}
                  onChange={(e) => setLocalCols(parseInt(e.target.value, 10) || MIN_GRID)}
                  onBlur={handleColsBlur}
                  className="w-16"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {MIN_GRID}–{MAX_GRID} each. Changes apply immediately.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
