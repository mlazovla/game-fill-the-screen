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
