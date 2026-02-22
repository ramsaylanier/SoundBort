import { useCallback } from 'react'
import { SoundCell } from './SoundCell'

export function SoundGrid({
  sounds,
  gridCols = 4,
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
      className="grid gap-3 w-full max-w-4xl mx-auto h-full p-2"
      style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
    >
      {sounds.map((sound, index) => (
        <SoundCell
          key={sound?.id ?? `empty-${index}`}
          sound={sound}
          index={index}
          isPlaying={sound?.id === playingSoundId}
          keybindings={sound ? getKeybindings(sound.id) : []}
          midiBindings={sound?.midiBindings ?? []}
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
