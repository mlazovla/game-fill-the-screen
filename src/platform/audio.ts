interface AudioOutput {
  context: AudioContext
  destination: AudioNode
}

let output: AudioOutput | null = null
let muted = false

function createOutput(): AudioOutput | null {
  try {
    const context = new AudioContext({ latencyHint: 'interactive' })
    const compressor = context.createDynamicsCompressor()
    compressor.threshold.value = -12
    compressor.ratio.value = 6
    compressor.connect(context.destination)
    document.addEventListener('visibilitychange', () => {
      void (document.hidden || muted ? context.suspend() : context.resume())
    })
    return { context, destination: compressor }
  } catch {
    return null
  }
}

export function setSoundMuted(value: boolean) {
  muted = value
  if (output) void (muted ? output.context.suspend() : output.context.resume())
}

export function getAudioOutput() {
  if (muted) return null
  output ??= createOutput()
  if (output?.context.state === 'suspended') void output.context.resume()
  return output
}
