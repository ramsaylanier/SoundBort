import { useEffect, useCallback, useState, useMemo } from 'react'
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
import { noteNumberToName, parseMidiMessage, midiBindingsConflict } from '@/utils/midiUtils'
import { X, Keyboard, Music } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useModalStore } from '@/stores/useModalStore'
import { useSoundboardStore } from '@/stores/useSoundboardStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useMIDIAccess } from '@/hooks/useMIDIAccess'
import type { MidiBinding } from '@/types'

const midiSupported = typeof navigator !== 'undefined' && !!navigator.requestMIDIAccess

export function BindModal() {
  const keybindModalCell = useModalStore((s) => s.keybindModalCell)
  const closeKeybindModal = useModalStore((s) => s.closeKeybindModal)
  const soundboard = useSoundboardStore((s) => s.soundboard)
  const updateSound = useSoundboardStore((s) => s.updateSound)
  const midiEnabled = useSettingsStore((s) => s.midiEnabled)
  const defaultMidiDeviceId = useSettingsStore((s) => s.defaultMidiDeviceId)

  const { midiAccess: midiAccessProp } = useMIDIAccess(midiEnabled)
  const midiDevices = useMemo(() => {
    if (!midiAccessProp?.inputs) return []
    return Array.from(midiAccessProp.inputs.values()).map((input) => ({
      id: input.id,
      name: input.name || input.id,
    }))
  }, [midiAccessProp])

  const open = keybindModalCell != null
  const modalSound = keybindModalCell != null ? soundboard?.sounds?.[keybindModalCell] ?? null : null
  const soundName = modalSound?.name
  const existingKeybinds = modalSound?.keybindings ?? []
  const existingMIDIBinds = modalSound?.midiBindings ?? []

  const [activeTab, setActiveTab] = useState<'keyboard' | 'midi'>('keyboard')
  const [midiAccessLocal, setMidiAccessLocal] = useState<MIDIAccess | null>(null)
  const midiAccess = midiAccessProp ?? midiAccessLocal
  const [selectedMidiDeviceId, setSelectedMidiDeviceId] = useState<string>(() =>
    defaultMidiDeviceId || (midiDevices[0]?.id ?? '')
  )

  const keybindingsMap = useMemo(() => {
    const map: Record<string, string[]> = {}
    soundboard?.sounds?.forEach((s) => {
      if (s?.keybindings?.length) map[s.id] = s.keybindings
    })
    return map
  }, [soundboard])

  const midiBindingsMap = useMemo(() => {
    const map: Record<string, MidiBinding[]> = {}
    soundboard?.sounds?.forEach((s) => {
      if (s?.midiBindings?.length) map[s.id] = s.midiBindings
    })
    return map
  }, [soundboard])

  useEffect(() => {
    if (!open || !midiEnabled || !midiSupported || midiAccessProp != null) {
      if (!midiAccessProp) queueMicrotask(() => setMidiAccessLocal(null))
      return
    }
    navigator.requestMIDIAccess().then(setMidiAccessLocal).catch(() => setMidiAccessLocal(null))
  }, [open, midiEnabled, midiAccessProp])

  const handleKeybind = useCallback(
    (keybind: string) => {
      if (keybindModalCell == null || !modalSound) return
      if (modalSound.keybindings?.includes(keybind)) {
        toast.info('Key already bound to this sound')
        return
      }
      const conflict = Object.entries(keybindingsMap).find(
        ([id, bindings]) => id !== modalSound.id && bindings?.includes(keybind)
      )
      if (conflict) {
        const [conflictSoundId] = conflict
        const conflictSound = soundboard?.sounds?.find((s) => s?.id === conflictSoundId)
        toast.error(
          `"${keybind}" is already bound to "${conflictSound?.name ?? 'another sound'}". Choose a different key.`
        )
        return
      }
      updateSound(keybindModalCell, { ...modalSound, keybindings: [keybind] })
      toast.success(`Bound ${keybind}`)
    },
    [keybindModalCell, modalSound, keybindingsMap, soundboard, updateSound]
  )

  const handleRemoveKeybind = useCallback(
    (keybind: string) => {
      if (keybindModalCell == null || !modalSound) return
      updateSound(keybindModalCell, { ...modalSound, keybindings: [] })
      toast.success(`Removed ${keybind}`)
    },
    [keybindModalCell, modalSound, updateSound]
  )

  const handleMIDIBind = useCallback(
    (binding: MidiBinding) => {
      if (keybindModalCell == null || !modalSound) return
      const existing = modalSound.midiBindings ?? []
      if (existing.some((b) => midiBindingsConflict(binding, b))) {
        toast.info('MIDI note already bound to this sound')
        return
      }
      const conflict = Object.entries(midiBindingsMap).find(
        ([id, bindings]) =>
          id !== modalSound.id &&
          bindings?.some((b) => midiBindingsConflict(binding, b))
      )
      if (conflict) {
        const [conflictSoundId] = conflict
        const conflictSound = soundboard?.sounds?.find((s) => s?.id === conflictSoundId)
        toast.error(
          `This note is already bound to "${conflictSound?.name ?? 'another sound'}". Choose a different note.`
        )
        return
      }
      updateSound(keybindModalCell, { ...modalSound, midiBindings: [binding] })
      toast.success(`Bound ${noteNumberToName(binding.note)}`)
    },
    [keybindModalCell, modalSound, midiBindingsMap, soundboard, updateSound]
  )

  const handleRemoveMIDIBind = useCallback(
    (binding: MidiBinding) => {
      if (keybindModalCell == null || !modalSound) return
      updateSound(keybindModalCell, { ...modalSound, midiBindings: [] })
      toast.success(`Removed ${noteNumberToName(binding.note)}`)
    },
    [keybindModalCell, modalSound, updateSound]
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      e.preventDefault()
      if (['Tab', 'Escape'].includes(e.key)) return
      if (isModifierKey(e.key)) return
      const str = keybindToString(e)
      if (keybindPartCount(str) > 3) return
      handleKeybind(str)
    },
    [handleKeybind]
  )

  const handleMidiMessage = useCallback(
    (e: MIDIMessageEvent) => {
      if (!e.data) return
      const parsed = parseMidiMessage(e.data)
      if (parsed) {
        const deviceId = ((e.target as MIDIInput)?.id ?? selectedMidiDeviceId) || undefined
        handleMIDIBind({ ...parsed, deviceId })
      }
    },
    [handleMIDIBind, selectedMidiDeviceId]
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
    const inputList = Array.from(inputs.values())
    const toAttach = selectedMidiDeviceId
      ? inputList.filter((i) => i.id === selectedMidiDeviceId)
      : inputList
    toAttach.forEach((input) => {
      input.addEventListener('midimessage', handleMessage)
    })
    return () => {
      toAttach.forEach((input) => {
        input.removeEventListener('midimessage', handleMessage)
      })
    }
  }, [open, activeTab, midiAccess, selectedMidiDeviceId, handleMidiMessage])

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeKeybindModal()}>
      <DialogContent key={open ? 'open' : 'closed'} onPointerDownOutside={closeKeybindModal}>
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
                      onClick={() => handleRemoveKeybind(k)}
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
                            onClick={() => handleRemoveMIDIBind(b)}
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
          <Button variant="outline" onClick={closeKeybindModal}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
