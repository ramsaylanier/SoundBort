import { useAudioDevice } from '@/hooks/useAudioDevice'
import { AudioDeviceContext } from '@/contexts/AudioDeviceContext'

export function AudioDeviceProvider({ children }: { children: React.ReactNode }) {
  const audio = useAudioDevice()
  return (
    <AudioDeviceContext.Provider value={audio}>
      {children}
    </AudioDeviceContext.Provider>
  )
}
