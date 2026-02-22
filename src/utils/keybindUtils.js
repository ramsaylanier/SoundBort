export function keybindToString(e) {
  const parts = []
  if (e.ctrlKey) parts.push('ctrl')
  if (e.altKey) parts.push('alt')
  if (e.shiftKey) parts.push('shift')
  parts.push(e.key.toLowerCase())
  return parts.join('+')
}

export function parseKeybind(str) {
  const parts = str.toLowerCase().split('+')
  const key = parts.pop()
  return { key, ctrl: parts.includes('ctrl'), alt: parts.includes('alt'), shift: parts.includes('shift') }
}

export function keybindMatches(e, str) {
  const { key, ctrl, alt, shift } = parseKeybind(str)
  return (
    e.key.toLowerCase() === key &&
    !!e.ctrlKey === ctrl &&
    !!e.altKey === alt &&
    !!e.shiftKey === shift
  )
}
