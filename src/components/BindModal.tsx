import { useEffect, useCallback, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { keybindToString, isModifierKey, keybindPartCount } from '@/utils/keybindUtils'
import { noteNumberToName, parseMidiMessage } from '@/utils/midiUtils'
import { X, Keyboard, Music } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MidiBinding, MidiDeviceOption } from '@/types'

const midiSupported = typeof navigator !== 'undefined' && !!navigator.requestMIDIAccess

interface BindModalProps {
  open: boolean
  onClose: () => void
  soundName?: string
  onKeybind?: (_keybind: string) => void
  onRemoveKeybind?: (_keybind: string) => void
  existingKeybinds?: string[]
  onMIDIBind?: (_binding: MidiBinding) => void
  onRemoveMIDIBind?: (_binding: MidiBinding) => void
  existingMIDIBinds?: MidiBinding[]
  midiEnabled?: boolean
  midiDevices?: MidiDeviceOption[]
  defaultMidiDeviceId?: string
}

export function BindModal({
  open,
  onClose,
  soundName,
  onKeybind,
  onRemoveKeybind,
  existingKeybinds = [],
  onMIDIBind,
  onRemoveMIDIBind,
  existingMIDIBinds = [],
  midiEnabled,
  midiDevices = [],
  defaultMidiDeviceId = '',
}: BindModalProps) {
  const [activeTab, setActiveTab] = useState<'keyboard' | 'midi'>('keyboard')
  const [midiAccess, setMidiAccess] = useState<MIDIAccess | null>(null)
  const [selectedMidiDeviceId, setSelectedMidiDeviceId] = useState<string>(() =>
    defaultMidiDeviceId || (midiDevices[0]?.id ?? '')
  )

  useEffect(() => {
    if (open && activeTab === 'midi') {
      const fallback = defaultMidiDeviceId || (midiDevices[0]?.id ?? '')
      setSelectedMidiDeviceId((prev) =>
        midiDevices.some((d) => d.id === prev) ? prev : fallback
      )
    }
  }, [open, activeTab, defaultMidiDeviceId, midiDevices])

  useEffect(() => {
    if (!open || !midiEnabled || !midiSupported) {
      queueMicrotask(() => setMidiAccess(null))
      return
    }
    navigator.requestMIDIAccess().then(setMidiAccess).catch(() => setMidiAccess(null))
  }, [open, midiEnabled])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      e.preventDefault()
      if (['Tab', 'Escape'].includes(e.key)) return
      if (isModifierKey(e.key)) return
      const str = keybindToString(e)
      if (keybindPartCount(str) > 3) return
      onKeybind?.(str)
    },
    [onKeybind]
  )

  const handleMidiMessage = useCallback(
    (e: MIDIMessageEvent) => {
      if (!e.data) return
      const parsed = parseMidiMessage(e.data)
      if (parsed) {
        const deviceId = selectedMidiDeviceId || undefined
        onMIDIBind?.({ ...parsed, deviceId })
      }
    },
    [onMIDIBind, selectedMidiDeviceId]
  )

  useEffect(() => {
    if (!open) return
    if (activeTab === 'keyboard') {
      window.addEventListener('keydown', handleKeyDown, { capture: true })
      return () => window.removeEventListener('keydown', handleKeyDown, { capture: true })
    }
  }, [open, activeTab, handleKeyDown])

  useEffect(() => {
    if (!open || activeTab !== 'midi' || !midiAccess) return
    const handleMessage = (e: MIDIMessageEvent) => handleMidiMessage(e)
    const inputs = midiAccess.inputs
    if (!inputs) return
    const toAttach = selectedMidiDeviceId
      ? Array.from(inputs).filter((i) => i.id === selectedMidiDeviceId)
      : Array.from(inputs)
    toAttach.forEach((input) => {
      input.onmidimessage = handleMessage
    })
    return () => {
      toAttach.forEach((input) => {
        input.onmidimessage = null
      })
    }
  }, [open, activeTab, midiAccess, selectedMidiDeviceId, handleMidiMessage])

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent onPointerDownOutside={onClose}>
        <DialogHeader>
          <DialogTitle>Set binding</DialogTitle>
          <DialogDescription>
            {soundName ? `Bind a trigger for "${soundName}"` : 'Bind a trigger'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 border-b">
          <button
            type="button"
            onClick={() => setActiveTab('keyboard')}
            className={cn(
              'px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === 'keyboard'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Keyboard className="size-4 inline mr-1.5 align-middle" />
            Keyboard
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('midi')}
            className={cn(
              'px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === 'midi'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Music className="size-4 inline mr-1.5 align-middle" />
            MIDI
          </button>
        </div>

        {activeTab === 'keyboard' && (
          <>
            <p className="text-sm text-muted-foreground">
              One binding per sound. Press a key combination (e.g. Ctrl+1). Hold modifiers first,
              then press the key.
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
          </>
        )}

        {activeTab === 'midi' && (
          <>
            {!midiEnabled ? (
              <p className="text-sm text-muted-foreground">
                Enable MIDI in Settings to bind notes.
              </p>
            ) : !midiSupported ? (
              <p className="text-sm text-muted-foreground">
                MIDI is not supported in this browser.
              </p>
            ) : (
              <>
                {midiDevices.length > 0 && (
                  <div className="space-y-2">
                    <label htmlFor="bind-midi-device" className="text-sm font-medium">
                      MIDI device
                    </label>
                    <Select
                      value={selectedMidiDeviceId || 'all'}
                      onValueChange={(v) => setSelectedMidiDeviceId(v === 'all' ? '' : v)}
                    >
                      <SelectTrigger id="bind-midi-device" className="w-full">
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
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  Press a MIDI key on your controller. One binding per sound.
                </p>
                {existingMIDIBinds.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {existingMIDIBinds.map((b) => {
                      const label = noteNumberToName(b.note)
                      return (
                        <span
                          key={`${b.note}-${b.channel}`}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded text-sm"
                        >
                          <span className="text-xs">{label}</span>
                          <button
                            type="button"
                            onClick={() => onRemoveMIDIBind?.(b)}
                            className="p-0.5 rounded hover:bg-muted-foreground/20"
                            aria-label={`Remove ${label}`}
                          >
                            <X className="size-3" />
                          </button>
                        </span>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </>
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
