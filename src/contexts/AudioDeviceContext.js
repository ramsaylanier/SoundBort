import { createContext, useContext } from 'react'

export const AudioDeviceContext = createContext(null)

export function useAudioDeviceContext() {
  const context = useContext(AudioDeviceContext)
  if (!context) {
    throw new Error('useAudioDeviceContext must be used within AudioDeviceProvider')
  }
  return context
}
