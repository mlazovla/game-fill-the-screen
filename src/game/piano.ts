import { getAudioOutput } from '../platform/audio'

const HARMONICS = [1, 0.5, 0.28, 0.16, 0.1, 0.06]
const HARMONICS_SUM = HARMONICS.reduce((sum, amplitude) => sum + amplitude, 0)
const INHARMONICITY = 0.0004
const ATTACK_S = 0.004
const NOTE_LENGTH_S = 3
const HAMMER_LENGTH_S = 0.03

let hammerNoise: AudioBuffer | null = null

function getHammerNoise(context: BaseAudioContext) {
  if (hammerNoise?.sampleRate === context.sampleRate) return hammerNoise
  const length = Math.round(context.sampleRate * HAMMER_LENGTH_S)
  hammerNoise = context.createBuffer(1, length, context.sampleRate)
  const data = hammerNoise.getChannelData(0)
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2
  return hammerNoise
}

export function playPianoNote(frequency: number, volume = 0.5) {
  const audio = getAudioOutput()
  if (!audio) return
  const { context, destination } = audio
  const start = context.currentTime
  const stop = start + NOTE_LENGTH_S

  const filter = context.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(Math.min(frequency * 14, 16000), start)
  filter.frequency.exponentialRampToValueAtTime(Math.max(frequency * 3, 500), start + 1.2)
  filter.connect(destination)

  HARMONICS.forEach((amplitude, index) => {
    const n = index + 1
    const oscillator = context.createOscillator()
    oscillator.frequency.value = frequency * n * Math.sqrt(1 + INHARMONICITY * n * n)
    const gain = context.createGain()
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime((volume * amplitude) / HARMONICS_SUM, start + ATTACK_S)
    gain.gain.setTargetAtTime(0, start + ATTACK_S, 0.9 / n ** 0.6)
    oscillator.connect(gain).connect(filter)
    oscillator.start(start)
    oscillator.stop(stop)
  })

  const hammer = context.createBufferSource()
  hammer.buffer = getHammerNoise(context)
  const hammerFilter = context.createBiquadFilter()
  hammerFilter.type = 'bandpass'
  hammerFilter.frequency.value = Math.min(frequency * 6, 6000)
  const hammerGain = context.createGain()
  hammerGain.gain.value = volume * 0.15
  hammer.connect(hammerFilter).connect(hammerGain).connect(destination)
  hammer.start(start)
}
