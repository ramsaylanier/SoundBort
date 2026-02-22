const MODIFIER_KEYS = new Set(['control', 'alt', 'shift', 'meta'])

export function isModifierKey(key) {
  return MODIFIER_KEYS.has(key?.toLowerCase())
}

/** Returns keybind string from event. Call only when e.key is NOT a modifier. */
export function keybindToString(e) {
  const parts = []
  if (e.ctrlKey) parts.push('ctrl')
  if (e.altKey) parts.push('alt')
  if (e.shiftKey) parts.push('shift')
  if (e.metaKey) parts.push('meta')
  parts.push(e.key.toLowerCase())
  return parts.join('+')
}

export function parseKeybind(str) {
  const parts = str.toLowerCase().split('+')
  const key = parts.pop()
  return {
    key,
    ctrl: parts.includes('ctrl'),
    alt: parts.includes('alt'),
    shift: parts.includes('shift'),
    meta: parts.includes('meta'),
  }
}

/** Max 3 keys per binding (e.g. ctrl+shift+1). */
export function keybindPartCount(str) {
  return str?.split('+').length ?? 0
}

export function keybindMatches(e, str) {
  const { key, ctrl, alt, shift, meta } = parseKeybind(str)
  return (
    e.key.toLowerCase() === key &&
    !!e.ctrlKey === ctrl &&
    !!e.altKey === alt &&
    !!e.shiftKey === shift &&
    !!e.metaKey === meta
  )
}
