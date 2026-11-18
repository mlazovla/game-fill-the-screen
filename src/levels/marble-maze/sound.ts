import { getAudioOutput } from '../../platform/audio'

let click: AudioBuffer | null = null

function createClick(context: AudioContext) {
  const rate = context.sampleRate
  const buffer = context.createBuffer(1, Math.ceil(0.08 * rate), rate)
  const data = buffer.getChannelData(0)
  let previous = 0
  for (let i = 0; i < data.length; i++) {
    const t = i / rate
    const white = Math.random() * 2 - 1
    const noise = (white - previous) * Math.exp(-t / 0.003)
    previous = white
    const knock = Math.sin(2 * Math.PI * 2300 * t) * Math.exp(-t / 0.012) * 0.6
    const body = Math.sin(2 * Math.PI * 900 * t) * Math.exp(-t / 0.02) * 0.4
    data[i] = noise + knock + body
  }
  const peak = data.reduce((max, value) => Math.max(max, Math.abs(value)), 0) || 1
  for (let i = 0; i < data.length; i++) data[i] /= peak
  return buffer
}

export function playClick(strength: number) {
  const audio = getAudioOutput()
  if (!audio) return
  const { context, destination } = audio
  click ??= createClick(context)
  const source = context.createBufferSource()
  source.buffer = click
  source.playbackRate.value = 0.9 + Math.random() * 0.2
  const volume = context.createGain()
  volume.gain.value = 0.08 + 0.4 * Math.min(1, strength)
  source.connect(volume).connect(destination)
  source.onended = () => volume.disconnect()
  source.start()
}
