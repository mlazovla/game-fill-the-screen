export interface Gravity {
  x: number
  y: number
  z: number
}

export const UPRIGHT_GRAVITY: Gravity = { x: 0, y: 1, z: 0 }

type PermissionRequestable = { requestPermission?: () => Promise<string> }

const DEG = Math.PI / 180

function requestFrom(api: unknown): Promise<boolean> {
  const requestable = api as PermissionRequestable | undefined
  if (typeof requestable?.requestPermission !== 'function') return Promise.resolve(true)
  return requestable.requestPermission().then(
    (state) => state === 'granted',
    () => false,
  )
}

export function requestMotionPermission(): Promise<boolean> {
  const orientation = requestFrom(globalThis.DeviceOrientationEvent)
  const motion = requestFrom(globalThis.DeviceMotionEvent)
  return Promise.all([orientation, motion]).then((results) => results.some(Boolean))
}

function screenAngle() {
  const legacy = (window as { orientation?: number }).orientation
  return (screen.orientation?.angle ?? legacy ?? 0) * DEG
}

export function subscribeGravity(onChange: (gravity: Gravity) => void) {
  const onOrientation = (event: DeviceOrientationEvent) => {
    if (event.beta === null || event.gamma === null) return
    const beta = event.beta * DEG
    const gamma = event.gamma * DEG
    const deviceX = Math.cos(beta) * Math.sin(gamma)
    const deviceUp = -Math.sin(beta)
    const deviceZ = -Math.cos(beta) * Math.cos(gamma)
    const angle = screenAngle()
    const screenX = deviceX * Math.cos(angle) - deviceUp * Math.sin(angle)
    const screenUp = deviceX * Math.sin(angle) + deviceUp * Math.cos(angle)
    onChange({ x: screenX, y: -screenUp, z: deviceZ })
  }
  window.addEventListener('deviceorientation', onOrientation)
  return () => window.removeEventListener('deviceorientation', onOrientation)
}
