import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useAudioDeviceStore } from '@/stores/useAudioDeviceStore'
import { Volume2 } from 'lucide-react'

export function UnlockAudioModal() {
  const audioContext = useAudioDeviceStore((s) => s.audioContext)
  const selectedInputDeviceId = useAudioDeviceStore((s) => s.selectedInputDeviceId)
  const unlockModalDismissed = useAudioDeviceStore((s) => s.unlockModalDismissed)
  const setUnlockModalDismissed = useAudioDeviceStore((s) => s.setUnlockModalDismissed)

  const show =
    !selectedInputDeviceId &&
    !unlockModalDismissed &&
    audioContext?.state === 'suspended'

  const handleEnable = async () => {
    if (audioContext?.state === 'suspended') {
      await audioContext.resume()
    }
    setUnlockModalDismissed(true)
  }

  return (
    <Dialog open={show} onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Volume2 className="size-5" />
            Enable audio playback
          </DialogTitle>
          <DialogDescription>
            Browsers require a user gesture before audio can play. Click the
            button below to enable MIDI and keyboard triggers.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={handleEnable} className="gap-2">
            <Volume2 className="size-4" />
            Enable audio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
