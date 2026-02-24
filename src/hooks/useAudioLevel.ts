import { useState, useEffect } from 'react'

export function useAudioLevel(
  analyser: AnalyserNode | null
): number {
  const [level, setLevel] = useState(0)

  useEffect(() => {
    let rafId: number
    let dataArray: Uint8Array | null = null

    function tick() {
      const node = analyser
      if (!node) {
        setLevel(0)
        rafId = requestAnimationFrame(tick)
        return
      }
      if (!dataArray) {
        dataArray = new Uint8Array(node.frequencyBinCount)
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- AnalyserNode.getByteFrequencyData has strict ArrayBuffer typing
      node.getByteFrequencyData(dataArray as any)
      let sum = 0
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i]! * dataArray[i]!
      }
      const rms = Math.sqrt(sum / dataArray.length)
      setLevel(rms / 255)
      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [analyser])

  return level
}
