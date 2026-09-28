interface AudioOutput {
  context: AudioContext
  destination: AudioNode
}

let output: AudioOutput | null = null

function createOutput(): AudioOutput | null {
  try {
    const context = new AudioContext({ latencyHint: 'interactive' })
    const compressor = context.createDynamicsCompressor()
    compressor.threshold.value = -12
    compressor.ratio.value = 6
    compressor.connect(context.destination)
    return { context, destination: compressor }
  } catch {
    return null
  }
}

export function getAudioOutput() {
  output ??= createOutput()
  if (output?.context.state === 'suspended') void output.context.resume()
  return output
}
