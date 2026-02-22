import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { LevelMeter } from '@/components/LevelMeter'
import { SlidersHorizontal } from 'lucide-react'
import { useAudioLevel } from '@/hooks/useAudioLevel'

const BusRow = ({ label, level, value, onValueChange }) => {

  const toSlider = (v) => Math.round((v ?? 1) * 100)
  const fromSlider = (v) => (v ?? 100) / 100
  return (<div className="flex items-center gap-3">
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
  </div>)
}

export function Mixer({
  mixerLevels,
  setMixerLevels,
  sounds,
  setSoundVolume,
  onSoundVolumeChange,
  analyserMicRef,
  analyserSoundboardRef,
  analyserMasterRef,
  levelBySoundId = {},
}) {
  const micLevel = useAudioLevel(analyserMicRef)
  const soundboardLevel = useAudioLevel(analyserSoundboardRef)
  const masterLevel = useAudioLevel(analyserMasterRef)

  const toSlider = (v) => Math.round((v ?? 1) * 100)
  const fromSlider = (v) => (v ?? 100) / 100

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
          {sounds?.filter(Boolean).length > 0 && (
            <div>
              <label className="text-sm font-medium block mb-2">
                Per-sound volume
              </label>
              <div className="space-y-3">
                {sounds
                  .filter(Boolean)
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
