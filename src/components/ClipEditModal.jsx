import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Play, Square } from 'lucide-react'
import { useAudioDeviceContext } from '@/contexts/AudioDeviceContext'

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = (seconds % 60).toFixed(1)
  return `${m}:${s.padStart(2, '0')}`
}

export function ClipEditModal({
  open,
  onClose,
  sound,
  onSave,
}) {
  const { audioContext } = useAudioDeviceContext()
  const [duration, setDuration] = useState(null)
  const [name, setName] = useState('')
  const [startTime, setStartTime] = useState(0)
  const [endTime, setEndTime] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const bufferRef = useRef(null)
  const sourceRef = useRef(null)

  const loadDuration = useCallback(async () => {
    if (!sound?.audioBlob || !audioContext) return
    setLoading(true)
    setError(null)
    bufferRef.current = null
    try {
      const arrayBuffer = await sound.audioBlob.arrayBuffer()
      const decoded = await audioContext.decodeAudioData(arrayBuffer)
      bufferRef.current = decoded
      const d = decoded.duration
      setDuration(d)
      setName(sound.name ?? '')
      setStartTime(sound.startTime ?? 0)
      setEndTime(sound.endTime ?? d)
    } catch (err) {
      console.error('Failed to decode audio:', err)
      setError('Could not load audio')
    } finally {
      setLoading(false)
    }
  }, [sound?.audioBlob, sound?.name, sound?.startTime, sound?.endTime, audioContext])

  useEffect(() => {
    if (open && sound) {
      loadDuration()
    }
  }, [open, sound?.id, loadDuration])

  useEffect(() => {
    if (!open) {
      if (sourceRef.current) {
        try {
          sourceRef.current.stop()
        } catch {
          // Already stopped
        }
        sourceRef.current = null
      }
      setIsPlaying(false)
    }
  }, [open])

  const handleSave = useCallback(() => {
    if (duration == null) return
    const start = Math.max(0, Math.min(startTime, duration - 0.01))
    const end = Math.max(start + 0.01, Math.min(endTime ?? duration, duration))
    const trimmedName = (name ?? '').trim() || sound?.name || 'Untitled'
    onSave?.(start, end, trimmedName)
    onClose?.()
  }, [duration, startTime, endTime, name, sound?.name, onSave, onClose])

  const handleStartChange = useCallback(
    (v) => {
      const num = Number(v)
      if (Number.isNaN(num)) return
      const maxEnd = endTime ?? duration ?? Infinity
      const val = Math.max(0, Math.min(num, maxEnd - 0.01))
      setStartTime(val)
    },
    [endTime, duration]
  )

  const handleEndChange = useCallback(
    (v) => {
      const num = Number(v)
      if (Number.isNaN(num)) return
      const val = Math.max(startTime + 0.01, Math.min(num, duration ?? Infinity))
      setEndTime(val)
    },
    [startTime, duration]
  )

  const handleRangeChange = useCallback(
    ([a, b]) => {
      if (duration == null) return
      const [startPct, endPct] = a <= b ? [a, b] : [b, a]
      const start = (startPct / 100) * duration
      const end = (endPct / 100) * duration
      setStartTime(Math.max(0, Math.min(start, duration - 0.01)))
      setEndTime(Math.max(start + 0.01, Math.min(end, duration)))
    },
    [duration]
  )

  const rangeValue =
    duration != null && duration > 0
      ? [
          ((startTime / duration) * 100).toFixed(1),
          (((endTime ?? duration) / duration) * 100).toFixed(1),
        ].map(Number)
      : [0, 100]

  const canSave = duration != null && startTime < (endTime ?? duration)

  const handlePreview = useCallback(() => {
    if (!audioContext || !bufferRef.current || duration == null) return
    if (isPlaying && sourceRef.current) {
      try {
        sourceRef.current.stop()
      } catch {
        // Already stopped
      }
      sourceRef.current = null
      setIsPlaying(false)
      return
    }
    const start = Math.max(0, Math.min(startTime, duration - 0.01))
    const end = Math.max(start + 0.01, Math.min(endTime ?? duration, duration))
    const playDuration = end - start
    try {
      const source = audioContext.createBufferSource()
      sourceRef.current = source
      source.buffer = bufferRef.current
      source.connect(audioContext.destination)
      source.onended = () => {
        sourceRef.current = null
        setIsPlaying(false)
      }
      setIsPlaying(true)
      source.start(0, start, playDuration)
    } catch (err) {
      console.error('Preview failed:', err)
      sourceRef.current = null
      setIsPlaying(false)
    }
  }, [audioContext, duration, startTime, endTime, isPlaying])

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent onPointerDownOutside={onClose}>
        <DialogHeader>
          <DialogTitle>Edit clip</DialogTitle>
          <DialogDescription>
            Rename the clip and set start/end markers.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <p className="text-sm text-muted-foreground">Loading audio…</p>
        )}
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        {!loading && duration != null && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="clip-name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="clip-name"
                type="text"
                placeholder="Clip name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <p className="text-sm text-muted-foreground">
              Total duration: {formatTime(duration)}
            </p>

            <div className="space-y-2">
              <label className="text-sm font-medium">Range (0–100%)</label>
              <Slider
                value={rangeValue}
                onValueChange={handleRangeChange}
                min={0}
                max={100}
                step={0.5}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="clip-start" className="text-sm font-medium">
                  Start (seconds)
                </label>
                <Input
                  id="clip-start"
                  type="number"
                  min={0}
                  max={duration}
                  step={0.1}
                  value={startTime.toFixed(2)}
                  onChange={(e) => handleStartChange(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="clip-end" className="text-sm font-medium">
                  End (seconds)
                </label>
                <Input
                  id="clip-end"
                  type="number"
                  min={0}
                  max={duration}
                  step={0.1}
                  value={(endTime ?? duration).toFixed(2)}
                  onChange={(e) => handleEndChange(e.target.value)}
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Playback: {formatTime((endTime ?? duration) - startTime)}
            </p>

            <Button
              variant="outline"
              size="sm"
              onClick={handlePreview}
              disabled={!canSave}
              className="gap-2"
            >
              {isPlaying ? (
                <>
                  <Square className="size-4" />
                  Stop
                </>
              ) : (
                <>
                  <Play className="size-4" />
                  Preview
                </>
              )}
            </Button>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
