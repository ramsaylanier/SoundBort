import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { LevelMeter } from '@/components/LevelMeter'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { useAudioLevel } from '@/hooks/useAudioLevel'

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
  const [open, setOpen] = useState(false)
  const micLevel = useAudioLevel(analyserMicRef)
  const soundboardLevel = useAudioLevel(analyserSoundboardRef)
  const masterLevel = useAudioLevel(analyserMasterRef)

  const toSlider = (v) => Math.round((v ?? 1) * 100)
  const fromSlider = (v) => (v ?? 100) / 100

  const BusRow = ({ label, level, value, onValueChange }) => (
    <div className="flex items-center gap-3">
      <label className="text-sm font-medium w-24 shrink-0">{label}</label>
      <LevelMeter level={level} orientation="horizontal" />
      <Slider
        value={[toSlider(value)]}
        onValueChange={([v]) => onValueChange(fromSlider(v))}
        min={0}
        max={100}
        className="flex-1"
      />
    </div>
  )

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          Mixer
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-4 p-4 rounded-lg border bg-card space-y-6 max-w-md">
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
              onValueChange={(v) => setMixerLevels((prev) => ({ ...prev, soundboard: v }))}
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
              <label className="text-sm font-medium block mb-2">Per-sound volume</label>
              <div className="space-y-3">
                {sounds
                  .filter(Boolean)
                  .map((s) => (
                    <div key={s.id} className="flex items-center gap-3">
                      <span className="text-sm truncate w-24">{s.name}</span>
                      <LevelMeter level={levelBySoundId[s.id] ?? 0} orientation="horizontal" />
                      <Slider
                        value={[toSlider(s.volume ?? 1)]}
                        onValueChange={([v]) => {
                          const vol = fromSlider(v)
                          setSoundVolume?.(s.id, vol)
                          onSoundVolumeChange?.(s.id, vol)
                        }}
                        min={0}
                        max={100}
                        className="flex-1"
                      />
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
