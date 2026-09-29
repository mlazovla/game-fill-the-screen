const GRAVITY_SMOOTHING = 0.1
const MAX_INTERVAL_S = 0.1

export function subscribeShake(onShake: (acceleration: number, dt: number) => void) {
  let gravity: [number, number, number] | null = null
  let lastTime = 0

  const onMotion = (event: DeviceMotionEvent) => {
    const a = event.accelerationIncludingGravity
    if (a?.x == null || a.y == null || a.z == null) return
    const sample: [number, number, number] = [a.x, a.y, a.z]
    const dt = Math.min(MAX_INTERVAL_S, Math.max(0, (event.timeStamp - lastTime) / 1000))
    lastTime = event.timeStamp
    if (!gravity) {
      gravity = sample
      return
    }
    const g = gravity
    gravity = [0, 1, 2].map((i) => g[i] + (sample[i] - g[i]) * GRAVITY_SMOOTHING) as [number, number, number]
    onShake(Math.hypot(sample[0] - g[0], sample[1] - g[1], sample[2] - g[2]), dt)
  }

  window.addEventListener('devicemotion', onMotion)
  return () => window.removeEventListener('devicemotion', onMotion)
}
