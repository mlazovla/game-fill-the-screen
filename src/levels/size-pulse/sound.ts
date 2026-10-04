import { getAudioOutput } from '../../platform/audio'

const TONE_GAIN = 0.06
const ATTACK_S = 0.04
const RELEASE_S = 0.12
const GLIDE_S = 0.03
const STOP_S = 0.3

export function startPulseTone() {
  const audio = getAudioOutput()
  if (!audio) return { update: () => undefined, stop: () => undefined }
  const { context, destination } = audio

  const gain = context.createGain()
  gain.gain.value = 0
  gain.connect(destination)
  const oscillator = context.createOscillator()
  oscillator.type = 'sine'
  oscillator.connect(gain)
  oscillator.start()
  oscillator.onended = () => gain.disconnect()
  let audible = false
  let stopped = false

  return {
    update(frequency: number, on: boolean) {
      const now = context.currentTime
      oscillator.frequency.setTargetAtTime(frequency, now, GLIDE_S)
      if (on === audible) return
      audible = on
      gain.gain.setTargetAtTime(on ? TONE_GAIN : 0, now, on ? ATTACK_S : RELEASE_S)
    },
    stop() {
      if (stopped) return
      stopped = true
      const now = context.currentTime
      gain.gain.setTargetAtTime(0, now, RELEASE_S)
      oscillator.stop(now + STOP_S)
    },
  }
}
