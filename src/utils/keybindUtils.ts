const MODIFIER_KEYS = new Set(['control', 'alt', 'shift', 'meta'])

export function isModifierKey(key: string | undefined): boolean {
  return MODIFIER_KEYS.has(key?.toLowerCase() ?? '')
}

export function keybindToString(e: KeyboardEvent): string {
  const parts: string[] = []
  if (e.ctrlKey) parts.push('ctrl')
  if (e.altKey) parts.push('alt')
  if (e.shiftKey) parts.push('shift')
  if (e.metaKey) parts.push('meta')
  parts.push(e.key.toLowerCase())
  return parts.join('+')
}

export interface ParsedKeybind {
  key: string
  ctrl: boolean
  alt: boolean
  shift: boolean
  meta: boolean
}

export function parseKeybind(str: string): ParsedKeybind {
  const parts = str.toLowerCase().split('+')
  const key = parts.pop() ?? ''
  return {
    key,
    ctrl: parts.includes('ctrl'),
    alt: parts.includes('alt'),
    shift: parts.includes('shift'),
    meta: parts.includes('meta'),
  }
}

export function keybindPartCount(str: string | undefined): number {
  return str?.split('+').length ?? 0
}

export function keybindMatches(e: KeyboardEvent, str: string): boolean {
  const { key, ctrl, alt, shift, meta } = parseKeybind(str)
  return (
    e.key.toLowerCase() === key &&
    !!e.ctrlKey === ctrl &&
    !!e.altKey === alt &&
    !!e.shiftKey === shift &&
    !!e.metaKey === meta
  )
}
