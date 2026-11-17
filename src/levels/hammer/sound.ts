import { getAudioOutput } from '../../platform/audio'

type Render = (data: Float32Array, sampleRate: number) => void

const between = (min: number, max: number) => min + Math.random() * (max - min)

function addPing(data: Float32Array, sampleRate: number, at: number, frequency: number, decay: number, amplitude: number) {
  const start = Math.floor(at * sampleRate)
  const length = Math.min(data.length - start, Math.floor(decay * 6 * sampleRate))
  const phase = Math.random() * Math.PI * 2
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate
    data[start + i] += Math.sin(2 * Math.PI * frequency * t + phase) * amplitude * Math.exp(-t / decay)
  }
}

function addNoise(data: Float32Array, sampleRate: number, at: number, decay: number, amplitude: number) {
  const start = Math.floor(at * sampleRate)
  const length = Math.min(data.length - start, Math.floor(decay * 6 * sampleRate))
  let previous = 0
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1
    data[start + i] += (white - previous) * amplitude * Math.exp(-i / sampleRate / decay)
    previous = white
  }
}

function play(seconds: number, gain: number, render: Render) {
  const audio = getAudioOutput()
  if (!audio) return
  const { context, destination } = audio
  const buffer = context.createBuffer(1, Math.ceil(seconds * context.sampleRate), context.sampleRate)
  const data = buffer.getChannelData(0)
  render(data, context.sampleRate)
  const peak = data.reduce((max, value) => Math.max(max, Math.abs(value)), 0) || 1
  for (let i = 0; i < data.length; i++) data[i] /= peak

  const source = context.createBufferSource()
  source.buffer = buffer
  const volume = context.createGain()
  volume.gain.value = gain
  source.connect(volume).connect(destination)
  source.onended = () => volume.disconnect()
  source.start()
}

export function playTing() {
  play(1.2, 0.3, (data, rate) => {
    const base = between(1700, 2000)
    addPing(data, rate, 0, base, 0.35, 1)
    addPing(data, rate, 0, base * 2.76, 0.16, 0.45)
    addPing(data, rate, 0, base * 5.4, 0.07, 0.25)
  })
}

export function playCrack(intensity: number) {
  play(0.5, 0.25 + 0.25 * intensity, (data, rate) => {
    addNoise(data, rate, 0, 0.012, 1)
    const clicks = Math.round(4 + 10 * intensity)
    for (let i = 0; i < clicks; i++) {
      const at = Math.random() ** 2 * 0.25
      addNoise(data, rate, at, between(0.002, 0.006), between(0.2, 0.7))
      addPing(data, rate, at, between(3000, 7000), between(0.004, 0.012), between(0.1, 0.4))
    }
  })
}

export function playShatter(long: boolean) {
  const seconds = long ? 2.6 : 0.9
  play(seconds + 0.2, 0.5, (data, rate) => {
    addNoise(data, rate, 0, long ? 0.12 : 0.07, 1.4)
    const grains = long ? 260 : 90
    for (let i = 0; i < grains; i++) {
      const at = -Math.log(1 - Math.random() * 0.98) * seconds * 0.28
      if (at > seconds) continue
      const amplitude = between(0.15, 0.6) * Math.exp(-at / seconds)
      addPing(data, rate, at, between(2200, 7500), between(0.006, 0.03), amplitude)
      if (Math.random() < 0.3) addNoise(data, rate, at, between(0.002, 0.008), amplitude * 0.8)
    }
  })
}
