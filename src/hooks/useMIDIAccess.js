import { useState, useEffect, useCallback } from 'react'

const midiSupported = typeof navigator !== 'undefined' && !!navigator.requestMIDIAccess

export function useMIDIAccess(midiEnabled) {
  const [midiAccess, setMidiAccess] = useState(null)
  const [midiError, setMidiError] = useState(null)

  useEffect(() => {
    if (!midiEnabled || !midiSupported) {
      setMidiAccess(null)
      setMidiError(null)
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
          setMidiError(err?.message ?? 'Failed to access MIDI')
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
