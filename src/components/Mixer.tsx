import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LevelMeter } from '@/components/LevelMeter'
import { SlidersHorizontal, Mic, MicOff, Speaker } from 'lucide-react'
import { useAudioLevel } from '@/hooks/useAudioLevel'
import { useAudioDeviceContext } from '@/contexts/AudioDeviceContext'
import type { Sound, MixerLevels } from '@/types'

interface BusRowProps {
  label: string
  level: number
  value: number
  onValueChange: (v: number) => void
}

const BusRow = ({ label, level, value, onValueChange }: BusRowProps) => {
  const toSlider = (v: number | undefined) => Math.round((v ?? 1) * 100)
  const fromSlider = (v: number | undefined) => (v ?? 100) / 100
  return (
    <div className="flex items-center gap-3">
      <label className="text-sm font-medium w-24 shrink-0">{label}</label>
      <LevelMeter level={level} orientation="horizontal" />
      <Slider
        value={[toSlider(value)]}
        onValueChange={([v]) => onValueChange(fromSlider(v))}
        min={0}
        max={100}
        step={1}
        className="flex-1"
      />
    </div>
  )
}

interface MixerProps {
  mixerLevels: MixerLevels
  setMixerLevels: React.Dispatch<React.SetStateAction<MixerLevels>>
  sounds: (Sound | null)[] | undefined
  setSoundVolume?: (soundId: string, volume: number) => void
  onSoundVolumeChange?: (soundId: string, volume: number) => void
  levelBySoundId?: Record<string, number>
}

export function Mixer({
  mixerLevels,
  setMixerLevels,
  sounds,
  setSoundVolume,
  onSoundVolumeChange,
  levelBySoundId = {},
}: MixerProps) {
  const audio = useAudioDeviceContext()
  const {
    analyserMicRef,
    analyserSoundboardRef,
    analyserMasterRef,
    outputSelectSupported,
    selectOutputDevice,
    inputDevices = [],
    selectedInputDeviceId,
    setInputDevice,
    micMuted,
    setMicMuted,
    error,
  } = audio

  const micLevel = useAudioLevel(analyserMicRef)
  const soundboardLevel = useAudioLevel(analyserSoundboardRef)
  const masterLevel = useAudioLevel(analyserMasterRef)

  const toSlider = (v: number | undefined) => Math.round((v ?? 1) * 100)
  const fromSlider = (v: number | undefined) => (v ?? 100) / 100

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <SlidersHorizontal className="size-4" />
          Mixer
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Mixer</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-6 p-4 pt-0">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-2">Devices</label>
              <div className="flex flex-col gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectOutputDevice}
                  disabled={!outputSelectSupported}
                  className="gap-2 w-full justify-start"
                >
                  <Speaker className="size-4 shrink-0" />
                  {outputSelectSupported ? 'Select output device' : 'Output (use system default)'}
                </Button>
                <div className="flex items-center gap-2">
                  <Select
                    value={selectedInputDeviceId ?? 'none'}
                    onValueChange={(v) => setInputDevice?.(v === 'none' ? null : v)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select microphone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No microphone</SelectItem>
                      {inputDevices.map((d) => (
                        <SelectItem key={d.deviceId} value={d.deviceId}>
                          {d.label || `Device ${d.deviceId.slice(0, 8)}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant={micMuted ? 'destructive' : 'outline'}
                    size="icon"
                    onClick={() => setMicMuted?.(!micMuted)}
                    title={micMuted ? 'Unmute mic' : 'Mute mic'}
                  >
                    {micMuted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
                  </Button>
                </div>
                {error && (
                  <p className="text-sm text-destructive" role="alert">
                    {error}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <BusRow
              label="Mic"
              level={micLevel}
              value={mixerLevels.mic}
              onValueChange={(v) => setMixerLevels((prev) => ({ ...prev, mic: v }))}
            />
            <BusRow
              label="Soundboard"
              level={soundboardLevel}
              value={mixerLevels.soundboard}
              onValueChange={(v) =>
                setMixerLevels((prev) => ({ ...prev, soundboard: v }))
              }
            />
            <BusRow
              label="Master"
              level={masterLevel}
              value={mixerLevels.master}
              onValueChange={(v) => setMixerLevels((prev) => ({ ...prev, master: v }))}
            />
          </div>
          {(sounds?.filter(Boolean).length ?? 0) > 0 && (
            <div>
              <label className="text-sm font-medium block mb-2">
                Per-sound volume
              </label>
              <div className="space-y-3">
                {(sounds ?? [])
                  .filter((s): s is Sound => Boolean(s))
                  .map((s) => (
                    <div key={s.id} className="flex items-center gap-3">
                      <span className="text-sm truncate w-24">{s.name}</span>
                      <LevelMeter
                        level={levelBySoundId[s.id] ?? 0}
                        orientation="horizontal"
                      />
                      <Slider
                        value={[toSlider(s.volume ?? 1)]}
                        onValueChange={([v]) => {
                          const vol = fromSlider(v)
                          setSoundVolume?.(s.id, vol)
                          onSoundVolumeChange?.(s.id, vol)
                        }}
                        min={0}
                        max={100}
                        step={1}
                        className="flex-1"
                      />
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
