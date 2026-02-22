import { useEffect, useCallback } from 'react'
import { keybindMatches } from '@/utils/keybindUtils'

export function useKeyboardBindings(
  keybindingsMap: Record<string, string[]>,
  onTrigger: (soundId: string) => void | undefined,
  enabled = true
) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return
      if (['input', 'textarea'].includes(document.activeElement?.tagName?.toLowerCase() ?? ''))
        return
      if (e.repeat) return

      for (const [soundId, bindings] of Object.entries(keybindingsMap)) {
        if (!Array.isArray(bindings)) continue
        for (const binding of bindings) {
          if (keybindMatches(e, binding)) {
            e.preventDefault()
            onTrigger?.(soundId)
            return
          }
        }
      }
    },
    [keybindingsMap, onTrigger, enabled]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}
