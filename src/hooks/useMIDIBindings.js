import { useEffect, useRef } from 'react'
import { parseMidiMessage, midiBindingMatches } from '@/utils/midiUtils'

/**
 * Subscribe to MIDI inputs and trigger sounds when bound notes are pressed.
 * @param {MIDIAccess|null} midiAccess - From useMIDIAccess
 * @param {Record<string, Array<{note: number, channel: number}>>} midiBindingsMap - soundId -> bindings
 * @param {(soundId: string) => void} onTrigger
 * @param {boolean} enabled
 */
export function useMIDIBindings(midiAccess, midiBindingsMap, onTrigger, enabled = true) {
  const onTriggerRef = useRef(onTrigger)
  const mapRef = useRef(midiBindingsMap)
  onTriggerRef.current = onTrigger
  mapRef.current = midiBindingsMap ?? {}

  useEffect(() => {
    if (!enabled || !midiAccess) return

    const handleMessage = (e) => {
      const parsed = parseMidiMessage(e.data)
      if (!parsed) return
      const map = mapRef.current
      for (const [soundId, bindings] of Object.entries(map)) {
        if (!Array.isArray(bindings)) continue
        for (const binding of bindings) {
          if (midiBindingMatches(parsed, binding)) {
            onTriggerRef.current?.(soundId)
            return
          }
        }
      }
    }

    const inputs = midiAccess.inputs
    if (inputs) {
      inputs.forEach((input) => {
        input.onmidimessage = handleMessage
      })
    }

    const handleStateChange = () => {
      midiAccess.inputs?.forEach((input) => {
        if (!input.onmidimessage) input.onmidimessage = handleMessage
      })
    }
    midiAccess.onstatechange = handleStateChange

    return () => {
      midiAccess.inputs?.forEach((input) => {
        input.onmidimessage = null
      })
      midiAccess.onstatechange = null
    }
  }, [midiAccess, enabled])
}
