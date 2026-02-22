// Extend browser APIs that may not be in all TypeScript libs yet
interface MediaDevices {
  selectAudioOutput?: (_options?: { suppressLocalPlayback?: boolean }) => Promise<MediaDeviceInfo>
}

interface AudioContext {
  setSinkId?: (_sinkId: string) => Promise<void>
}
