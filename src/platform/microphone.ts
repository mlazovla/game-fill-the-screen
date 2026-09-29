import { stopStream } from './userMedia'

export interface LevelMeter {
  readDecibels: () => number
  close: () => void
}

export function createLevelMeter(context: AudioContext, stream: MediaStream): LevelMeter {
  const source = context.createMediaStreamSource(stream)
  const analyser = context.createAnalyser()
  analyser.fftSize = 1024
  source.connect(analyser)
  const samples = new Float32Array(analyser.fftSize)
  if (context.state === 'suspended') void context.resume()
  let closed = false

  return {
    readDecibels() {
      analyser.getFloatTimeDomainData(samples)
      let sum = 0
      for (const sample of samples) sum += sample * sample
      return 10 * Math.log10(sum / samples.length + 1e-12)
    },
    close() {
      if (closed) return
      closed = true
      source.disconnect()
      stopStream(stream)
      void context.close()
    },
  }
}
