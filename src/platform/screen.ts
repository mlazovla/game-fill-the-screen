import { ORIENTATION } from '../config'

type LockableOrientation = ScreenOrientation & { lock?: (orientation: string) => Promise<void> }

const ignore = () => undefined

export async function enterImmersiveMode() {
  const root = document.documentElement
  if (!document.fullscreenElement && root.requestFullscreen) {
    await root.requestFullscreen({ navigationUI: 'hide' }).catch(ignore)
  }
  const orientation = screen.orientation as LockableOrientation | undefined
  await orientation?.lock?.(ORIENTATION).catch(ignore)
}

export function enterImmersiveModeOnRelease() {
  window.addEventListener('pointerup', () => void enterImmersiveMode(), { once: true })
}

export function keepScreenOn() {
  let sentinel: WakeLockSentinel | null = null
  let active = true

  const request = () => {
    if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return
    void navigator.wakeLock
      .request('screen')
      .then((acquired) => {
        if (active) sentinel = acquired
        else void acquired.release()
      })
      .catch(ignore)
  }

  request()
  document.addEventListener('visibilitychange', request)
  return () => {
    active = false
    document.removeEventListener('visibilitychange', request)
    void sentinel?.release().catch(ignore)
  }
}
