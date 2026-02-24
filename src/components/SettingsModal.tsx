import { useCallback, useState, useMemo } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MIN_GRID, MAX_GRID, getStoredGridSize } from '@/constants'
import { cn } from '@/lib/utils'
import { useModalStore } from '@/stores/useModalStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useSoundboardStore } from '@/stores/useSoundboardStore'
import { useMIDIAccess } from '@/hooks/useMIDIAccess'

const midiSupported = typeof navigator !== 'undefined' && !!navigator.requestMIDIAccess

export function SettingsModal() {
  const settingsOpen = useModalStore((s) => s.settingsOpen)
  const closeSettings = useModalStore((s) => s.closeSettings)
  const gridRows = useSettingsStore((s) => s.gridRows)
  const gridCols = useSettingsStore((s) => s.gridCols)
  const setGrid = useSettingsStore((s) => s.setGrid)
  const midiEnabled = useSettingsStore((s) => s.midiEnabled)
  const setMidiEnabled = useSettingsStore((s) => s.setMidiEnabled)
  const defaultMidiDeviceId = useSettingsStore((s) => s.defaultMidiDeviceId)
  const setDefaultMidiDeviceId = useSettingsStore((s) => s.setDefaultMidiDeviceId)
  const soundboard = useSoundboardStore((s) => s.soundboard)
  const updateSoundboard = useSoundboardStore((s) => s.updateSoundboard)

  const { midiAccess } = useMIDIAccess(midiEnabled)
  const midiDevices = useMemo(() => {
    if (!midiAccess?.inputs) return []
    return Array.from(midiAccess.inputs.values()).map((input) => ({
      id: input.id,
      name: input.name || input.id,
    }))
  }, [midiAccess])

  const [localRows, setLocalRows] = useState(() => gridRows ?? getStoredGridSize().rows)
  const [localCols, setLocalCols] = useState(() => gridCols ?? getStoredGridSize().cols)
  const [midiError, setMidiError] = useState<string | null>(null)

  const handleMidiToggle = useCallback(async () => {
    if (!midiSupported) return
    const next = !midiEnabled
    if (next) {
      try {
        await navigator.requestMIDIAccess()
        setMidiError(null)
        setMidiEnabled(true)
      } catch (err) {
        setMidiError((err as Error).message ?? 'Failed to access MIDI')
      }
    } else {
      setMidiEnabled(false)
      setMidiError(null)
    }
  }, [midiEnabled, setMidiEnabled])

  const applyGrid = useCallback(
    (rows: number, cols: number) => {
      const r = Math.min(MAX_GRID, Math.max(MIN_GRID, rows))
      const c = Math.min(MAX_GRID, Math.max(MIN_GRID, cols))
      setLocalRows(r)
      setLocalCols(c)
      setGrid(r, c)
      const newSize = r * c
      const currentSounds = soundboard?.sounds ?? []
      let newSounds: (typeof currentSounds)[number][]
      if (currentSounds.length > newSize) {
        newSounds = currentSounds.slice(0, newSize)
      } else if (currentSounds.length < newSize) {
        newSounds = [...currentSounds, ...Array(newSize - currentSounds.length).fill(null)]
      } else {
        return
      }
      updateSoundboard({ sounds: newSounds })
    },
    [setGrid, soundboard, updateSoundboard]
  )

  const handleRowsBlur = useCallback(() => {
    applyGrid(localRows, localCols)
  }, [localRows, localCols, applyGrid])

  const handleColsBlur = useCallback(() => {
    applyGrid(localRows, localCols)
  }, [localRows, localCols, applyGrid])

  return (
    <Dialog open={settingsOpen} onOpenChange={(o) => !o && closeSettings()}>
      <DialogContent key={settingsOpen ? 'open' : 'closed'} onPointerDownOutside={closeSettings}>
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
            {midiEnabled && midiDevices.length > 0 && (
              <div className="space-y-2">
                <label htmlFor="default-midi-device" className="text-sm font-medium">
                  Default MIDI device
                </label>
                <Select
                  value={defaultMidiDeviceId || 'all'}
                  onValueChange={(v) => setDefaultMidiDeviceId(v === 'all' ? '' : v)}
                >
                  <SelectTrigger id="default-midi-device" className="w-full">
                    <SelectValue placeholder="Select device" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All devices</SelectItem>
                    {midiDevices.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name || d.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Used for new bindings and legacy bindings without a device.
                </p>
              </div>
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
          <Button variant="outline" onClick={closeSettings}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
