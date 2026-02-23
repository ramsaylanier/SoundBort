import { useEffect, useRef } from 'react'
import { parseMidiMessage, midiBindingMatches } from '@/utils/midiUtils'
import type { MidiBinding } from '@/types'

export function useMIDIBindings(
  midiAccess: MIDIAccess | null,
  midiBindingsMap: Record<string, MidiBinding[]>,
  onTrigger: (soundId: string) => void | undefined,
  enabled = true,
  defaultDeviceId?: string,
  bindModalOpen = false
) {
  const onTriggerRef = useRef(onTrigger)
  const mapRef = useRef(midiBindingsMap)

  useEffect(() => {
    onTriggerRef.current = onTrigger
    mapRef.current = midiBindingsMap ?? {}
  })

  useEffect(() => {
    if (!enabled || !midiAccess || bindModalOpen) return

    const handleMessage = (e: MIDIMessageEvent) => {
      if (!e.data) return
      const parsed = parseMidiMessage(e.data)
      if (!parsed) return
      const eventDeviceId = (e.target as MIDIInput)?.id
      const map = mapRef.current
      for (const [soundId, bindings] of Object.entries(map)) {
        if (!Array.isArray(bindings)) continue
        for (const binding of bindings) {
          if (
            midiBindingMatches(
              parsed,
              binding,
              eventDeviceId,
              binding.deviceId,
              defaultDeviceId
            )
          ) {
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
    midiAccess.addEventListener('statechange', handleStateChange)

    return () => {
      midiAccess.inputs?.forEach((input) => {
        input.onmidimessage = null
      })
      midiAccess.removeEventListener('statechange', handleStateChange)
    }
  }, [midiAccess, enabled, defaultDeviceId, bindModalOpen])
}
