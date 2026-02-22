import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Mic, MicOff, Speaker } from 'lucide-react'

export function DeviceSelector({
  outputSelectSupported,
  selectOutputDevice,
  inputDevices,
  selectedInputDeviceId,
  setInputDevice,
  micMuted,
  setMicMuted,
  error,
}) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={selectOutputDevice}
          disabled={!outputSelectSupported}
          className="gap-2"
        >
          <Speaker className="size-4" />
          {outputSelectSupported ? 'Select Output' : 'Output (use default)'}
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Select
          value={selectedInputDeviceId || 'none'}
          onValueChange={(v) => setInputDevice(v === 'none' ? null : v)}
        >
          <SelectTrigger className="w-[220px]">
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
          onClick={() => setMicMuted(!micMuted)}
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
  )
}
