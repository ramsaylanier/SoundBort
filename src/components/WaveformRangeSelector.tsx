import { useCallback, useEffect, useRef, useState } from 'react'

interface WaveformRangeSelectorProps {
  buffer: AudioBuffer | null
  duration: number
  startTime: number
  endTime: number
  onStartChange: (t: number) => void
  onEndChange: (t: number) => void
  className?: string
}

const HANDLE_WIDTH = 8
const MIN_SELECTION = 0.05

function getWaveformData(buffer: AudioBuffer, width: number): Float32Array {
  const channel = buffer.getChannelData(0)
  const samples = channel.length
  const blockSize = Math.floor(samples / width)
  const result = new Float32Array(width)

  for (let i = 0; i < width; i++) {
    const start = i * blockSize
    let max = 0
    for (let j = 0; j < blockSize && start + j < samples; j++) {
      const v = Math.abs(channel[start + j])
      if (v > max) max = v
    }
    result[i] = max
  }
  return result
}

export function WaveformRangeSelector({
  buffer,
  duration,
  startTime,
  endTime,
  onStartChange,
  onEndChange,
  className = '',
}: WaveformRangeSelectorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState<'start' | 'end' | 'range' | null>(null)
  const [dragStartTime, setDragStartTime] = useState(0)

  const timeToX = useCallback(
    (t: number) => {
      const el = containerRef.current
      if (!el || duration <= 0) return 0
      const w = el.clientWidth
      return (t / duration) * w
    },
    [duration]
  )

  const xToTime = useCallback(
    (x: number) => {
      const el = containerRef.current
      if (!el || duration <= 0) return 0
      const w = el.clientWidth
      return Math.max(0, Math.min(duration, (x / w) * duration))
    },
    [duration]
  )

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container || !buffer) return

    const dpr = window.devicePixelRatio || 1
    const w = container.clientWidth
    const h = container.clientHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.scale(dpr, dpr)

    const width = Math.floor(w)
    const data = getWaveformData(buffer, width)

    const centerY = h / 2
    const halfH = (h - 4) / 2
    const startX = timeToX(startTime)
    const endX = timeToX(endTime)

    // Clear
    ctx.clearRect(0, 0, w, h)

    // Unselected regions (muted)
    ctx.fillStyle = 'rgba(128, 128, 128, 0.15)'
    if (startX > 0) {
      ctx.fillRect(0, 0, startX, h)
    }
    if (endX < w) {
      ctx.fillRect(endX, 0, w - endX, h)
    }

    // Waveform - unselected (muted)
    ctx.strokeStyle = 'rgba(128, 128, 128, 0.4)'
    ctx.lineWidth = 1
    ctx.beginPath()
    let started = false
    for (let i = 0; i < width; i++) {
      const x = i
      if (x >= startX && x <= endX) continue
      const v = data[i] * halfH
      const y = centerY - v
      if (!started) {
        ctx.moveTo(x, y)
        started = true
      } else {
        ctx.lineTo(x, y)
      }
    }
    for (let i = width - 1; i >= 0; i--) {
      const x = i
      if (x >= startX && x <= endX) continue
      const v = data[i] * halfH
      const y = centerY + v
      ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.stroke()
    ctx.fillStyle = 'rgba(128, 128, 128, 0.2)'
    ctx.fill()

    // Waveform - selected region (use theme primary)
    const primary = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '0.205 0 0'
    const primaryColor = primary.startsWith('oklch') ? primary : `oklch(${primary})`
    ctx.strokeStyle = primaryColor
    ctx.fillStyle = primaryColor.replace(')', ' / 0.4)').replace('oklch(', 'oklch(')
    ctx.beginPath()
    started = false
    for (let i = Math.max(0, Math.floor(startX)); i <= Math.min(width, Math.ceil(endX)); i++) {
      const x = i
      const v = data[i] * halfH
      const y = centerY - v
      if (!started) {
        ctx.moveTo(x, y)
        started = true
      } else {
        ctx.lineTo(x, y)
      }
    }
    for (let i = Math.min(width, Math.ceil(endX)); i >= Math.max(0, Math.floor(startX)); i--) {
      const x = i
      const v = data[i] * halfH
      const y = centerY + v
      ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.stroke()
    ctx.fill()

    // Start and end handles
    ctx.fillRect(startX - HANDLE_WIDTH / 2, 0, HANDLE_WIDTH, h)

    // End handle
    ctx.fillRect(endX - HANDLE_WIDTH / 2, 0, HANDLE_WIDTH, h)
  }, [buffer, startTime, endTime, timeToX])

  useEffect(() => {
    draw()
  }, [draw])

  useEffect(() => {
    const ro = new ResizeObserver(draw)
    const el = containerRef.current
    if (el) ro.observe(el)
    return () => ro.disconnect()
  }, [draw])

  const getHandleAt = useCallback(
    (clientX: number): 'start' | 'end' | null => {
      const el = containerRef.current
      if (!el) return null
      const rect = el.getBoundingClientRect()
      const x = clientX - rect.left
      const startX = timeToX(startTime)
      const endX = timeToX(endTime)

      if (Math.abs(x - startX) <= HANDLE_WIDTH) return 'start'
      if (Math.abs(x - endX) <= HANDLE_WIDTH) return 'end'
      return null
    },
    [startTime, endTime, timeToX]
  )

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const el = containerRef.current
      if (!el || duration <= 0) return
      const rect = el.getBoundingClientRect()
      const x = e.clientX - rect.left
      const t = xToTime(x)

      const handle = getHandleAt(e.clientX)
      if (handle === 'start') {
        setDragging('start')
        setDragStartTime(startTime)
      } else if (handle === 'end') {
        setDragging('end')
        setDragStartTime(endTime)
      } else {
        setDragging('range')
        setDragStartTime(t)
        const inSelection = t >= startTime && t <= endTime
        if (!inSelection) {
          onStartChange(t)
          onEndChange(Math.min(duration, t + Math.max(MIN_SELECTION, endTime - startTime)))
        }
      }
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    },
    [duration, startTime, endTime, xToTime, getHandleAt, onStartChange, onEndChange]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const el = containerRef.current
      if (!el || !dragging) return
      const rect = el.getBoundingClientRect()
      const x = e.clientX - rect.left
      const t = xToTime(x)

      if (dragging === 'start') {
        const newStart = Math.max(0, Math.min(t, endTime - MIN_SELECTION))
        onStartChange(newStart)
      } else if (dragging === 'end') {
        const newEnd = Math.max(startTime + MIN_SELECTION, Math.min(t, duration))
        onEndChange(newEnd)
      } else if (dragging === 'range') {
        const delta = t - dragStartTime
        const selLen = endTime - startTime
        let newStart = startTime + delta
        let newEnd = endTime + delta
        if (newStart < 0) {
          newStart = 0
          newEnd = selLen
        } else if (newEnd > duration) {
          newEnd = duration
          newStart = duration - selLen
        }
        onStartChange(newStart)
        onEndChange(newEnd)
      }
    },
    [dragging, startTime, endTime, duration, dragStartTime, xToTime, onStartChange, onEndChange]
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
      setDragging(null)
    },
    []
  )

  const handlePointerLeave = useCallback(() => {
    if (dragging) setDragging(null)
  }, [dragging])

  if (!buffer) return null

  return (
    <div
      ref={containerRef}
      className={`relative h-20 w-full cursor-crosshair overflow-hidden rounded-md border bg-muted/30 ${className}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onPointerCancel={handlePointerUp}
    >
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ touchAction: 'none' }}
      />
    </div>
  )
}
