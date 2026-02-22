import { useCallback, useMemo, useState, useEffect } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { getSoundboard } from '@/utils/soundboardStorage'
import { STORAGE_KEYS } from '@/constants'
import { DeviceSelector } from '@/components/DeviceSelector'
import { Mixer } from '@/components/Mixer'
import { SoundboardPicker } from '@/components/SoundboardPicker'
import { SoundGrid } from '@/components/SoundGrid'
import { KeybindModal } from '@/components/KeybindModal'
import { RecordModal } from '@/components/RecordModal'
import { ClipEditModal } from '@/components/ClipEditModal'
import { useAudioDevice } from '@/hooks/useAudioDevice'
import { useSoundboard } from '@/hooks/useSoundboard'
import { useKeyboardBindings } from '@/hooks/useKeyboardBindings'
import { toast } from 'sonner'

function App() {
  const audio = useAudioDevice()
  const {
    audioContext,
    soundboardGainRef,
    micGainRef,
    mixerLevels,
    setMixerLevels,
    analyserMicRef,
    analyserSoundboardRef,
    analyserMasterRef,
  } = audio

  const soundboard = useSoundboard(audioContext, soundboardGainRef)
  const {
    soundboard: currentSoundboard,
    setSoundboard,
    updateSound,
    updateSoundboard,
    playSound,
    playingSoundId,
    setSoundVolume,
    loadSoundboard,
    gainNodesRef,
    levelBySoundId,
  } = soundboard

  const [keybindModalCell, setKeybindModalCell] = useState(null)
  const [recordModalCell, setRecordModalCell] = useState(null)
  const [clipEditModalCell, setClipEditModalCell] = useState(null)

  useEffect(() => {
    if (audio.error) toast.error(audio.error)
  }, [audio.error])

  const keybindingsMap = useMemo(() => {
    const map = {}
    currentSoundboard?.sounds?.forEach((s) => {
      if (s?.keybindings?.length) map[s.id] = s.keybindings
    })
    return map
  }, [currentSoundboard?.sounds])

  const handleKeybindTrigger = useCallback(
    (soundId) => {
      const sound = currentSoundboard?.sounds?.find((s) => s?.id === soundId)
      if (sound) playSound(sound, sound.volume ?? 1)
    },
    [currentSoundboard?.sounds, playSound]
  )

  useKeyboardBindings(keybindingsMap, handleKeybindTrigger, !!currentSoundboard)

  const handleUpload = useCallback(
    (index, file) => {
      const sound = {
        id: crypto.randomUUID(),
        name: file.name.replace(/\.[^/.]+$/, ''),
        audioBlob: file,
        keybindings: [],
        volume: 1,
        startTime: 0,
        endTime: null,
      }
      updateSound(index, sound)
      toast.success(`Added "${sound.name}"`)
    },
    [updateSound]
  )

  const handleRecordComplete = useCallback(
    (index, blob, suggestedName) => {
      const sound = {
        id: crypto.randomUUID(),
        name: suggestedName || `Recording ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        audioBlob: blob,
        keybindings: [],
        volume: 1,
        startTime: 0,
        endTime: null,
      }
      updateSound(index, sound)
      toast.success(`Added "${sound.name}"`)
      setRecordModalCell(null)
    },
    [updateSound]
  )

  const handleSetKeybind = useCallback((index) => {
    setKeybindModalCell(index)
  }, [])

  const handleKeybindSet = useCallback(
    (keybind) => {
      if (keybindModalCell == null) return
      const sound = currentSoundboard?.sounds?.[keybindModalCell]
      if (!sound) return
      const existing = sound.keybindings || []
      if (existing.includes(keybind)) {
        toast.info('Key already bound to this sound')
        return
      }
      const conflict = Object.entries(keybindingsMap).find(
        ([id, bindings]) => id !== sound.id && bindings?.includes(keybind)
      )
      if (conflict) {
        toast.warning(`Key ${keybind} is already used by another sound. Both will trigger.`)
      }
      const newBindings = [...existing, keybind]
      updateSound(keybindModalCell, { ...sound, keybindings: newBindings })
      toast.success(`Bound ${keybind}`)
    },
    [keybindModalCell, currentSoundboard?.sounds, keybindingsMap, updateSound]
  )

  const handleRemoveKeybind = useCallback(
    (keybind) => {
      if (keybindModalCell == null) return
      const sound = currentSoundboard?.sounds?.[keybindModalCell]
      if (!sound) return
      const existing = sound.keybindings || []
      const newBindings = existing.filter((k) => k !== keybind)
      updateSound(keybindModalCell, { ...sound, keybindings: newBindings })
      toast.success(`Removed ${keybind}`)
    },
    [keybindModalCell, currentSoundboard?.sounds, updateSound]
  )

  const handleEditClip = useCallback((index) => {
    setClipEditModalCell(index)
  }, [])

  const handleClipEditSave = useCallback(
    (startTime, endTime, name) => {
      if (clipEditModalCell == null) return
      const sound = currentSoundboard?.sounds?.[clipEditModalCell]
      if (!sound) return
      updateSound(clipEditModalCell, {
        ...sound,
        startTime,
        endTime,
        ...(name != null && { name }),
      })
      toast.success('Clip updated')
      setClipEditModalCell(null)
    },
    [clipEditModalCell, currentSoundboard?.sounds, updateSound]
  )

  const handleSoundVolumeChange = useCallback(
    (soundId, volume) => {
      updateSoundboard({
        sounds: currentSoundboard.sounds.map((s) =>
          s?.id === soundId ? { ...s, volume } : s
        ),
      })
    },
    [currentSoundboard?.sounds, updateSoundboard]
  )

  const handleLoadSoundboard = useCallback(
    (board) => {
      loadSoundboard(board)
      if (board?.mixer) {
        setMixerLevels((prev) => ({ ...prev, ...board.mixer }))
      }
      if (board?.id) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_SOUNDBOARD_ID, board.id)
      }
    },
    [loadSoundboard, setMixerLevels]
  )

  useEffect(() => {
    const activeId = localStorage.getItem(STORAGE_KEYS.ACTIVE_SOUNDBOARD_ID)
    if (activeId) {
      getSoundboard(activeId).then((board) => {
        if (board) {
          loadSoundboard(board)
          if (board.mixer) setMixerLevels((prev) => ({ ...prev, ...board.mixer }))
        }
      })
    }
  }, [loadSoundboard, setMixerLevels])


  const modalSound = keybindModalCell != null ? currentSoundboard?.sounds?.[keybindModalCell] : null
  const clipEditSound = clipEditModalCell != null ? currentSoundboard?.sounds?.[clipEditModalCell] : null

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">SoundBort</h1>
          <div className="flex flex-wrap items-center gap-3">
            <DeviceSelector
              outputSelectSupported={audio.outputSelectSupported}
              selectOutputDevice={audio.selectOutputDevice}
              inputDevices={audio.inputDevices}
              selectedInputDeviceId={audio.selectedInputDeviceId}
              setInputDevice={audio.setInputDevice}
              micMuted={audio.micMuted}
              setMicMuted={audio.setMicMuted}
              error={audio.error}
            />
            <Mixer
              mixerLevels={mixerLevels}
              setMixerLevels={setMixerLevels}
              sounds={currentSoundboard?.sounds}
              setSoundVolume={setSoundVolume}
              onSoundVolumeChange={handleSoundVolumeChange}
              analyserMicRef={analyserMicRef}
              analyserSoundboardRef={analyserSoundboardRef}
              analyserMasterRef={analyserMasterRef}
              levelBySoundId={levelBySoundId}
            />
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-3">
          <SoundboardPicker
            soundboard={
              currentSoundboard
                ? { ...currentSoundboard, mixer: mixerLevels }
                : null
            }
            onLoad={handleLoadSoundboard}
            onSave={() => {}}
          />
        </div>

        <main>
          <SoundGrid
            sounds={currentSoundboard?.sounds ?? []}
            playingSoundId={playingSoundId}
            keybindingsMap={keybindingsMap}
            levelBySoundId={levelBySoundId}
            onPlay={(s) => playSound(s, s.volume ?? 1)}
            onUpload={handleUpload}
            onRecord={(index) => setRecordModalCell(index)}
            onSetKeybind={handleSetKeybind}
            onEditClip={handleEditClip}
          />
        </main>
      </div>

      <KeybindModal
        open={keybindModalCell != null}
        onClose={() => setKeybindModalCell(null)}
        soundName={modalSound?.name}
        onKeybind={handleKeybindSet}
        onRemoveKeybind={handleRemoveKeybind}
        existingKeybinds={modalSound?.keybindings ?? []}
      />

      <ClipEditModal
        open={clipEditModalCell != null}
        onClose={() => setClipEditModalCell(null)}
        sound={clipEditSound}
        audioContext={audioContext}
        onSave={handleClipEditSave}
      />

      <RecordModal
        open={recordModalCell != null}
        onClose={() => setRecordModalCell(null)}
        onRecordComplete={(blob, suggestedName) =>
          recordModalCell != null && handleRecordComplete(recordModalCell, blob, suggestedName)
        }
        micStream={audio.micStream}
        inputDeviceLabel={
          audio.inputDevices.find((d) => d.deviceId === audio.selectedInputDeviceId)?.label
        }
      />

      <Toaster />
    </div>
  )
}

export default App
