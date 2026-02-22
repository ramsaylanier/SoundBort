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
import { Mic, Monitor, Square, Circle } from 'lucide-react'
import { useAudioRecorder } from '@/hooks/useAudioRecorder'
import { useAudioDeviceContext } from '@/contexts/AudioDeviceContext'

const TAB_CAPTURE_SUPPORTED = !!navigator.mediaDevices?.getDisplayMedia

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function RecordModal({
  open,
  onClose,
  onRecordComplete,
}) {
  const audio = useAudioDeviceContext()
  const micStream = audio.micStream
  const inputDeviceLabel = audio.inputDevices.find(
    (d) => d.deviceId === audio.selectedInputDeviceId
  )?.label

  const [source, setSource] = useState('mic')
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const timerRef = useRef(null)

  const {
    isRecording,
    startRecording,
    stopRecording,
    recordedBlob,
    error,
    setError,
    clearError,
    clearRecordedBlob,
  } = useAudioRecorder()

  useEffect(() => {
    if (isRecording) {
      setElapsedSeconds(0)
      timerRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isRecording])

  const handleClose = useCallback(() => {
    if (isRecording) stopRecording()
    setElapsedSeconds(0)
    clearRecordedBlob()
    clearError()
    setSource('mic')
    onClose?.()
  }, [isRecording, stopRecording, clearRecordedBlob, clearError, onClose])

  const handleStartRecording = useCallback(async () => {
    clearError()
    if (source === 'mic') {
      if (!micStream) {
        return
      }
      startRecording(micStream)
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        })
        startRecording(stream)
      } catch (err) {
        if (err.name !== 'NotAllowedError') {
          setError(err.message || 'Failed to capture tab')
        }
      }
    }
  }, [source, micStream, startRecording, clearError, setError])

  const handleUseRecording = useCallback(() => {
    if (recordedBlob) {
      const name = `Recording ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      onRecordComplete?.(recordedBlob, name)
    }
    handleClose()
  }, [recordedBlob, onRecordComplete, handleClose])

  const handleDiscard = useCallback(() => {
    clearRecordedBlob()
    setElapsedSeconds(0)
    setSource('mic')
  }, [clearRecordedBlob])

  const micReady = !!micStream
  const canStartMic = source === 'mic' && micReady && !isRecording && !recordedBlob
  const canStartTab = source === 'tab' && !isRecording && !recordedBlob && TAB_CAPTURE_SUPPORTED

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent onPointerDownOutside={handleClose}>
        <DialogHeader>
          <DialogTitle>Record audio</DialogTitle>
          <DialogDescription>
            Choose a source, then start recording. Stop when done and use or discard.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!recordedBlob ? (
            <>
              <div className="flex gap-2">
                <Button
                  variant={source === 'mic' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1 gap-2"
                  onClick={() => setSource('mic')}
                  disabled={isRecording}
                >
                  <Mic className="size-4" />
                  From microphone
                </Button>
                <Button
                  variant={source === 'tab' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1 gap-2"
                  onClick={() => setSource('tab')}
                  disabled={isRecording || !TAB_CAPTURE_SUPPORTED}
                  title={
                    !TAB_CAPTURE_SUPPORTED
                      ? 'Tab capture requires Chrome or Edge'
                      : 'Record from a browser tab (e.g. YouTube)'
                  }
                >
                  <Monitor className="size-4" />
                  From tab
                </Button>
              </div>

              {source === 'mic' && !micReady && (
                <p className="text-sm text-muted-foreground">
                  Select a microphone in the device selector above.
                </p>
              )}

              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}

              {isRecording && (
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <span className="flex items-center gap-2">
                    <Circle className="size-3 fill-destructive text-destructive animate-pulse" />
                    Recording
                  </span>
                  <span className="font-mono text-lg">{formatTime(elapsedSeconds)}</span>
                </div>
              )}

              <DialogFooter>
                {isRecording ? (
                  <Button variant="destructive" onClick={stopRecording} className="gap-2">
                    <Square className="size-4" />
                    Stop
                  </Button>
                ) : (
                  <Button
                    onClick={handleStartRecording}
                    disabled={!canStartMic && !canStartTab}
                    className="gap-2"
                  >
                    <Circle className="size-4" />
                    Start recording
                  </Button>
                )}
              </DialogFooter>
            </>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Recording complete. Use it for this cell or discard.
              </p>
              <DialogFooter>
                <Button variant="outline" onClick={handleDiscard}>
                  Discard
                </Button>
                <Button onClick={handleUseRecording}>Use recording</Button>
              </DialogFooter>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
