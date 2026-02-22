import { useState, useEffect } from 'react'

const midiSupported =
  typeof navigator !== 'undefined' && !!navigator.requestMIDIAccess

export function useMIDIAccess(midiEnabled: boolean) {
  const [midiAccess, setMidiAccess] = useState<MIDIAccess | null>(null)
  const [midiError, setMidiError] = useState<string | null>(null)

  useEffect(() => {
    if (!midiEnabled || !midiSupported) {
      queueMicrotask(() => {
        setMidiAccess(null)
        setMidiError(null)
      })
      return
    }
    let cancelled = false
    navigator
      .requestMIDIAccess()
      .then((access) => {
        if (!cancelled) {
          setMidiAccess(access)
          setMidiError(null)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setMidiError((err as Error)?.message ?? 'Failed to access MIDI')
          setMidiAccess(null)
        }
      })
    return () => {
      cancelled = true
    }
  }, [midiEnabled])

  return {
    midiAccess,
    midiSupported,
    midiError,
  }
}
