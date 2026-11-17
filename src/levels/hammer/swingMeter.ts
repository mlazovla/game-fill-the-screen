export interface Swing {
  strength: number
  durationMs: number
  turnDeg: number | null
  source: 'linear' | 'filtered'
}

interface Sample {
  average: number
  alpha: number | null
  dtMs: number
}

const AVERAGE_SAMPLES = 5
const START_MS2 = 10
const END_MS2 = 5
const MAX_SWING_MS = 1500
const COOLDOWN_MS = 300
const GRAVITY_SMOOTHING = 0.1
const WINDUP_TOLERANCE_DEG_S = 30

function measure(samples: Sample[]) {
  let strikeSign = 0
  let fastest = 0
  let turnDeg: number | null = null
  for (const sample of samples) {
    if (sample.alpha === null) continue
    turnDeg = (turnDeg ?? 0) + (sample.alpha * sample.dtMs) / 1000
    if (Math.abs(sample.alpha) > fastest) {
      fastest = Math.abs(sample.alpha)
      strikeSign = Math.sign(sample.alpha)
    }
  }

  const strike = samples.filter(
    (sample) => sample.alpha === null || strikeSign === 0 || sample.alpha * strikeSign >= -WINDUP_TOLERANCE_DEG_S,
  )
  const strength = strike.reduce((max, sample) => Math.max(max, sample.average), 0)
  const durationMs = strike.reduce((sum, sample) => sum + (sample.average >= START_MS2 ? sample.dtMs : 0), 0)
  return { strength, durationMs, turnDeg }
}

export function subscribeSwings({ onStart, onSwing }: { onStart?: () => void; onSwing: (swing: Swing) => void }) {
  let gravity: { x: number; y: number; z: number } | null = null
  const recent: number[] = []
  let lastTime: number | null = null
  let cooldownUntil = 0
  let start: number | null = null
  let samples: Sample[] = []

  const linearAcceleration = (event: DeviceMotionEvent) => {
    const a = event.acceleration
    if (a?.x != null && a.y != null && a.z != null) return { x: a.x, y: a.y, z: a.z, source: 'linear' as const }
    const g = event.accelerationIncludingGravity
    if (g?.x == null || g.y == null || g.z == null) return null
    const previous = gravity ?? { x: g.x, y: g.y, z: g.z }
    gravity = {
      x: previous.x + (g.x - previous.x) * GRAVITY_SMOOTHING,
      y: previous.y + (g.y - previous.y) * GRAVITY_SMOOTHING,
      z: previous.z + (g.z - previous.z) * GRAVITY_SMOOTHING,
    }
    return { x: g.x - gravity.x, y: g.y - gravity.y, z: g.z - gravity.z, source: 'filtered' as const }
  }

  const onMotion = (event: DeviceMotionEvent) => {
    const a = linearAcceleration(event)
    if (!a) return
    const time = event.timeStamp
    const dtMs = lastTime === null ? event.interval : Math.min(100, time - lastTime)
    lastTime = time

    recent.push(Math.hypot(a.x, a.y, a.z))
    if (recent.length > AVERAGE_SAMPLES) recent.shift()
    if (recent.length < AVERAGE_SAMPLES || time < cooldownUntil) return
    const average = recent.reduce((sum, value) => sum + value, 0) / AVERAGE_SAMPLES

    if (start === null) {
      if (average < START_MS2) return
      start = time
      samples = []
      onStart?.()
    }

    samples.push({ average, alpha: event.rotationRate?.alpha ?? null, dtMs })

    if (average < END_MS2 || time - start >= MAX_SWING_MS) {
      onSwing({ ...measure(samples), source: a.source })
      start = null
      cooldownUntil = time + COOLDOWN_MS
    }
  }

  window.addEventListener('devicemotion', onMotion)
  return () => window.removeEventListener('devicemotion', onMotion)
}
