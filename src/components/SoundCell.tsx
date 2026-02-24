import { useRef, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LevelMeter } from '@/components/LevelMeter'
import { Volume2, Mic, Scissors, Keyboard, Trash2 } from 'lucide-react'
import { noteNumberToName } from '@/utils/midiUtils'
import { cn } from '@/lib/utils'
import { ACCEPTED_AUDIO_FORMATS, MAX_SOUND_FILE_SIZE_BYTES } from '@/constants'
import type { Sound, MidiBinding } from '@/types'

interface SoundCellProps {
  sound: Sound | null
  index: number
  isPlaying: boolean
  keybindings?: string[]
  midiBindings?: MidiBinding[]
  level?: number
  onPlay?: (sound: Sound) => void
  onUpload?: (index: number, file: File) => void
  onRecord?: (index: number) => void
  onSetKeybind?: (index: number) => void
  onEditClip?: (index: number) => void
  onRemove?: (index: number) => void
}

export function SoundCell({
  sound,
  index,
  isPlaying,
  keybindings = [],
  midiBindings = [],
  level = 0,
  onPlay,
  onUpload,
  onRecord,
  onSetKeybind,
  onEditClip,
  onRemove,
}: SoundCellProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleClick = useCallback(() => {
    if (sound) {
      onPlay?.(sound)
    } else {
      inputRef.current?.click()
    }
  }, [sound, onPlay])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      if (!ACCEPTED_AUDIO_FORMATS.includes(file.type as typeof ACCEPTED_AUDIO_FORMATS[number])) {
        alert('Please select an MP3, WAV, OGG, or WebM file.')
        return
      }
      if (file.size > MAX_SOUND_FILE_SIZE_BYTES) {
        alert(`File too large. Max ${MAX_SOUND_FILE_SIZE_BYTES / 1024 / 1024}MB.`)
        return
      }
      onUpload?.(index, file)
      e.target.value = ''
    },
    [index, onUpload]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files?.[0]
      if (!file) return
      if (!ACCEPTED_AUDIO_FORMATS.includes(file.type as typeof ACCEPTED_AUDIO_FORMATS[number])) return
      if (file.size > MAX_SOUND_FILE_SIZE_BYTES) return
      onUpload?.(index, file)
    },
    [index, onUpload]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => e.preventDefault(), [])

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:border-primary/50 min-h-[100px]',
        isPlaying && 'ring-2 ring-primary'
      )}
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <CardContent className="flex flex-col h-full justify-between">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_AUDIO_FORMATS.join(',')}
          className="hidden"
          onChange={handleFileChange}
        />
        {sound ? (
          <>
            <span className="text-sm font-medium truncate block w-full" title={sound.name}>
              {sound.name}
            </span>
            <div className="flex items-center gap-1">
              <LevelMeter level={level} orientation="vertical" className="h-6 min-h-6 w-1" />
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={(e) => {
                  e.stopPropagation()
                  onEditClip?.(index)
                }}
                title="Edit clip (start/end)"
              >
                <Scissors className="size-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={(e) => {
                  e.stopPropagation()
                  onSetKeybind?.(index)
                }}
                title="Set binding"
              >
                <Keyboard className="size-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-6 text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation()
                  onRemove?.(index)
                }}
                title="Remove clip"
              >
                <Trash2 className="size-3" />
              </Button>

            </div>
            <div className="text-xs text-muted-foreground flex flex-wrap gap-1">
              {keybindings.map((k) => (
                <kbd
                  key={k}
                  className="px-1 py-0.5 bg-muted rounded text-[10px] cursor-pointer hover:bg-muted/80"
                  onClick={(e) => {
                    e.stopPropagation()
                    onSetKeybind?.(index)
                  }}
                >
                  {k}
                </kbd>
              ))}
              {midiBindings.map((b) => (
                <span
                  key={`${b.note}-${b.channel}`}
                  className="px-1 py-0.5 bg-muted rounded text-[10px] cursor-pointer hover:bg-muted/80"
                  onClick={(e) => {
                    e.stopPropagation()
                    onSetKeybind?.(index)
                  }}
                  title="MIDI note"
                >
                  {noteNumberToName(b.note)}
                </span>
              ))}
              {keybindings.length === 0 && midiBindings.length === 0 && (
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  onClick={(e) => {
                    e.stopPropagation()
                    onSetKeybind?.(index)
                  }}
                >
                  add binding
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-muted-foreground h-full gap-4">
            <span className="text-xs">Click or drop audio</span>
            {onRecord && (
              <Button
                variant="outline"
                size="icon-xs"
                className="mt-1"
                onClick={(e) => {
                  e.stopPropagation()
                  onRecord?.(index)
                }}
                title="Record from mic or tab"
              >
                <Mic className="size-3" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
