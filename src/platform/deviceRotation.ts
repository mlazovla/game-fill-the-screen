export interface DeviceAngles {
  alpha: number
  beta: number
  gamma: number
}

export function subscribeDeviceRotation(onChange: (angles: DeviceAngles) => void) {
  let gyroscope = false

  const onMotion = (event: DeviceMotionEvent) => {
    const rate = event.rotationRate
    if (rate && (rate.alpha !== null || rate.beta !== null || rate.gamma !== null)) gyroscope = true
  }

  const onOrientation = (event: DeviceOrientationEvent) => {
    if (!gyroscope || event.alpha === null || event.beta === null || event.gamma === null) return
    onChange({ alpha: event.alpha, beta: event.beta, gamma: event.gamma })
  }

  window.addEventListener('devicemotion', onMotion)
  window.addEventListener('deviceorientation', onOrientation)
  return () => {
    window.removeEventListener('devicemotion', onMotion)
    window.removeEventListener('deviceorientation', onOrientation)
  }
}
