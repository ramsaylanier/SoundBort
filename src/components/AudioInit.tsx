import { useAudioDeviceInit } from '@/hooks/useAudioDeviceInit'
import { useSoundboardInit } from '@/hooks/useSoundboardInit'

export function AudioInit() {
  useAudioDeviceInit()
  useSoundboardInit()
  return null
}
