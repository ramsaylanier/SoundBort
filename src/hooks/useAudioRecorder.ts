import { useState, useCallback, useRef } from 'react'

const MIME_TYPES = ['audio/webm', 'audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg']

function getSupportedMimeType(): string {
  for (const mime of MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(mime)) return mime
  }
  return 'audio/webm'
}

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [error, setError] = useState<string | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  const clearError = useCallback(() => setError(null), [])
  const setErrorMsg = useCallback((msg: string | null) => setError(msg), [])

  const startRecording = useCallback((stream: MediaStream) => {
    if (!stream || !stream.getTracks?.().length) {
      setError('No audio stream available')
      return
    }
    const audioTracks = stream.getTracks().filter((t) => t.kind === 'audio')
    if (!audioTracks.length) {
      setError('No audio tracks in stream. For tab capture, enable "Share tab audio" in the picker.')
      return
    }
    if (typeof MediaRecorder === 'undefined') {
      setError('MediaRecorder is not supported in this browser')
      return
    }

    setError(null)
    setRecordedBlob(null)
    chunksRef.current = []
    streamRef.current = stream

    const recordStream =
      audioTracks.length === stream.getTracks().length
        ? stream
        : new MediaStream(audioTracks)

    try {
      const mimeType = getSupportedMimeType()
      const recorder = new MediaRecorder(recordStream, {
        mimeType,
        audioBitsPerSecond: 128000,
      })
      recorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        if (chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType })
          setRecordedBlob(blob)
        }
        chunksRef.current = []
        recorderRef.current = null
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop())
          streamRef.current = null
        }
      }

      recorder.onerror = (e) => setError((e as { error?: { message?: string } }).error?.message || 'Recording failed')

      recorder.start(100)
      setIsRecording(true)
    } catch (err) {
      setError((err as Error).message || 'Failed to start recording')
    }
  }, [])

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop()
    }
    setIsRecording(false)
  }, [])

  const clearRecordedBlob = useCallback(() => {
    setRecordedBlob(null)
  }, [])

  return {
    isRecording,
    startRecording,
    stopRecording,
    recordedBlob,
    error,
    setError: setErrorMsg,
    clearError,
    clearRecordedBlob,
  }
}
