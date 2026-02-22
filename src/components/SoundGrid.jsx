import { useCallback } from 'react'
import { SoundCell } from './SoundCell'
import { DEFAULT_GRID_COLS } from '@/constants'

export function SoundGrid({
  sounds,
  playingSoundId,
  keybindingsMap,
  levelBySoundId = {},
  onPlay,
  onUpload,
  onRecord,
  onSetKeybind,
  onEditClip,
}) {
  const getKeybindings = useCallback(
    (soundId) => keybindingsMap[soundId] || [],
    [keybindingsMap]
  )

  return (
    <div
      className="grid gap-3 w-full max-w-2xl"
      style={{ gridTemplateColumns: `repeat(${DEFAULT_GRID_COLS}, minmax(0, 1fr))` }}
    >
      {sounds.map((sound, index) => (
        <SoundCell
          key={sound?.id ?? `empty-${index}`}
          sound={sound}
          index={index}
          isPlaying={sound?.id === playingSoundId}
          keybindings={sound ? getKeybindings(sound.id) : []}
          level={sound ? levelBySoundId[sound.id] ?? 0 : 0}
          onPlay={onPlay}
          onUpload={onUpload}
          onRecord={onRecord}
          onSetKeybind={onSetKeybind}
          onEditClip={onEditClip}
        />
      ))}
    </div>
  )
}
