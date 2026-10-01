import { stopStream } from './userMedia'

export interface LevelMeter {
  readDecibels: () => number
  close: () => void
}

let analysisContext: AudioContext | null = null

export function prepareMicrophoneContext() {
  try {
    analysisContext ??= new AudioContext()
  } catch {
    return null
  }
  if (analysisContext.state === 'suspended') void analysisContext.resume()
  return analysisContext
}

export function createLevelMeter(stream: MediaStream): LevelMeter | null {
  const context = prepareMicrophoneContext()
  if (!context) {
    stopStream(stream)
    return null
  }
  const source = context.createMediaStreamSource(stream)
  const analyser = context.createAnalyser()
  analyser.fftSize = 1024
  source.connect(analyser)
  const samples = new Float32Array(analyser.fftSize)
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
    },
  }
}
