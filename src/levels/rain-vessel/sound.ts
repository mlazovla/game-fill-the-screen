import { getAudioOutput } from '../../platform/audio'

const NOISE_SECONDS = 4
const RAIN_GAIN = 0.22
const RAIN_SWELL = 0.3
const RAIN_SWELL_HZ = 0.09
const PATTER_GAIN = 0.1
const PATTER_PER_S = 350
const FADE_IN_S = 1.5
const FADE_OUT_S = 0.4
const DROP_GAIN = 0.36
const DROP_PAN_WIDTH = 0.7

interface RainBuffers {
  pink: AudioBuffer
  patter: AudioBuffer
}

const buffersByContext = new WeakMap<BaseAudioContext, RainBuffers>()
const randomBetween = (min: number, max: number) => min + Math.random() * (max - min)

function createPinkNoise(context: BaseAudioContext) {
  const buffer = context.createBuffer(2, context.sampleRate * NOISE_SECONDS, context.sampleRate)
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const data = buffer.getChannelData(channel)
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1
      b0 = 0.99886 * b0 + white * 0.0555179
      b1 = 0.99332 * b1 + white * 0.0750759
      b2 = 0.969 * b2 + white * 0.153852
      b3 = 0.8665 * b3 + white * 0.3104856
      b4 = 0.55 * b4 + white * 0.5329522
      b5 = -0.7616 * b5 - white * 0.016898
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
      b6 = white * 0.115926
    }
  }
  return buffer
}

function createPatter(context: BaseAudioContext) {
  const buffer = context.createBuffer(2, context.sampleRate * NOISE_SECONDS, context.sampleRate)
  const grain = Math.round(context.sampleRate * 0.002)
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const data = buffer.getChannelData(channel)
    const count = PATTER_PER_S * NOISE_SECONDS
    for (let n = 0; n < count; n++) {
      const start = Math.floor(Math.random() * (data.length - grain))
      const amplitude = randomBetween(0.05, 0.4) ** 2
      for (let i = 0; i < grain; i++) data[start + i] += (Math.random() * 2 - 1) * amplitude * (1 - i / grain) ** 3
    }
  }
  return buffer
}

function getBuffers(context: BaseAudioContext) {
  let buffers = buffersByContext.get(context)
  if (!buffers) {
    buffers = { pink: createPinkNoise(context), patter: createPatter(context) }
    buffersByContext.set(context, buffers)
  }
  return buffers
}

function filter(context: BaseAudioContext, type: BiquadFilterType, frequency: number, q = 0.7) {
  const node = context.createBiquadFilter()
  node.type = type
  node.frequency.value = frequency
  node.Q.value = q
  return node
}

export function startRainAmbience() {
  const audio = getAudioOutput()
  if (!audio) return () => undefined
  const { context, destination } = audio
  const { pink, patter } = getBuffers(context)
  const start = context.currentTime

  const master = context.createGain()
  master.gain.setValueAtTime(0, start)
  master.gain.linearRampToValueAtTime(1, start + FADE_IN_S)
  master.connect(destination)

  const rain = context.createBufferSource()
  rain.buffer = pink
  rain.loop = true
  const rainGain = context.createGain()
  rainGain.gain.value = RAIN_GAIN
  rain.connect(filter(context, 'highpass', 200)).connect(filter(context, 'lowpass', 6000)).connect(rainGain).connect(master)

  const swell = context.createOscillator()
  swell.frequency.value = RAIN_SWELL_HZ
  const swellDepth = context.createGain()
  swellDepth.gain.value = RAIN_GAIN * RAIN_SWELL
  swell.connect(swellDepth).connect(rainGain.gain)

  const drizzle = context.createBufferSource()
  drizzle.buffer = patter
  drizzle.loop = true
  const drizzleGain = context.createGain()
  drizzleGain.gain.value = PATTER_GAIN
  drizzle.connect(filter(context, 'highpass', 1800)).connect(drizzleGain).connect(master)

  const sources = [rain, swell, drizzle]
  rain.start(start, Math.random() * NOISE_SECONDS)
  drizzle.start(start, Math.random() * NOISE_SECONDS)
  swell.start(start)
  rain.onended = () => master.disconnect()

  return () => {
    const now = context.currentTime
    master.gain.cancelScheduledValues(now)
    master.gain.setValueAtTime(master.gain.value, now)
    master.gain.linearRampToValueAtTime(0, now + FADE_OUT_S)
    sources.forEach((source) => source.stop(now + FADE_OUT_S + 0.05))
  }
}

export function playDropImpact(pan: number) {
  const audio = getAudioOutput()
  if (!audio) return
  const { context, destination } = audio
  const { pink } = getBuffers(context)
  const start = context.currentTime
  const volume = DROP_GAIN * randomBetween(0.6, 1)

  const panner = context.createStereoPanner()
  panner.pan.value = Math.max(-1, Math.min(1, pan)) * DROP_PAN_WIDTH
  panner.connect(destination)

  const tick = context.createBufferSource()
  tick.buffer = pink
  const tickGain = context.createGain()
  tickGain.gain.setValueAtTime(0, start)
  tickGain.gain.linearRampToValueAtTime(volume, start + 0.001)
  tickGain.gain.setTargetAtTime(0, start + 0.001, 0.012)
  tick.connect(filter(context, 'bandpass', randomBetween(1800, 4200), 2.5)).connect(tickGain).connect(panner)
  tick.start(start, Math.random() * (NOISE_SECONDS - 0.1), 0.08)

  const plink = context.createOscillator()
  const pitch = randomBetween(700, 1400)
  plink.frequency.setValueAtTime(pitch, start)
  plink.frequency.exponentialRampToValueAtTime(pitch * 1.6, start + 0.04)
  const plinkGain = context.createGain()
  plinkGain.gain.setValueAtTime(0, start)
  plinkGain.gain.linearRampToValueAtTime(volume * 0.35, start + 0.002)
  plinkGain.gain.setTargetAtTime(0, start + 0.002, 0.02)
  plink.connect(plinkGain).connect(panner)
  plink.start(start)
  plink.stop(start + 0.15)
}
