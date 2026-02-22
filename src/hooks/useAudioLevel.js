import { useState, useEffect } from 'react'

/**
 * Polls an AnalyserNode and returns a 0-1 level for visualization.
 * Uses RMS from getByteFrequencyData for smooth level metering.
 * @param {React.RefObject<AnalyserNode | null>} analyserRef - Ref to the AnalyserNode
 * @returns {number} Level from 0 to 1
 */
export function useAudioLevel(analyserRef) {
  const [level, setLevel] = useState(0)

  useEffect(() => {
    let rafId
    let dataArray = null

    function tick() {
      const node = analyserRef?.current
      if (!node) {
        setLevel(0)
        rafId = requestAnimationFrame(tick)
        return
      }
      if (!dataArray) {
        dataArray = new Uint8Array(node.frequencyBinCount)
      }
      node.getByteFrequencyData(dataArray)
      let sum = 0
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i]
      }
      const rms = Math.sqrt(sum / dataArray.length)
      setLevel(rms / 255)
      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [analyserRef])

  return level
}
