import { useRef, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LevelMeter } from '@/components/LevelMeter'
import { Volume2, Plus, Mic, Scissors, Keyboard } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ACCEPTED_AUDIO_FORMATS, MAX_SOUND_FILE_SIZE_BYTES } from '@/constants'

export function SoundCell({
  sound,
  index,
  isPlaying,
  keybindings = [],
  level = 0,
  onPlay,
  onUpload,
  onRecord,
  onSetKeybind,
  onEditClip,
  onRemove,
}) {
  const inputRef = useRef(null)

  const handleClick = useCallback(() => {
    if (sound) {
      onPlay?.(sound)
    } else {
      inputRef.current?.click()
    }
  }, [sound, onPlay])

  const handleFileChange = useCallback(
    (e) => {
      const file = e.target.files?.[0]
      if (!file) return
      if (!ACCEPTED_AUDIO_FORMATS.includes(file.type)) {
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
    (e) => {
      e.preventDefault()
      const file = e.dataTransfer.files?.[0]
      if (!file) return
      if (!ACCEPTED_AUDIO_FORMATS.includes(file.type)) return
      if (file.size > MAX_SOUND_FILE_SIZE_BYTES) return
      onUpload?.(index, file)
    },
    [index, onUpload]
  )

  const handleDragOver = useCallback((e) => e.preventDefault(), [])

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
      <CardContent className="p-3 flex flex-col h-full justify-between">
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
                title="Set keybinding"
              >
                <Keyboard className="size-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={(e) => {
                  e.stopPropagation()
                  onPlay?.(sound)
                }}
              >
                <Volume2 className="size-3" />
              </Button>
            </div>
            {keybindings.length > 0 && (
              <div className="text-xs text-muted-foreground flex flex-wrap gap-1">
                {keybindings.map((k) => (
                  <kbd
                    key={k}
                    className="px-1 py-0.5 bg-muted rounded text-[10px]"
                    onClick={(e) => {
                      e.stopPropagation()
                      onSetKeybind?.(index)
                    }}
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground py-4">
            <Plus className="size-8" />
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
