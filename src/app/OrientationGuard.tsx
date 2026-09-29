import { ORIENTATION } from '../config'
import { useMediaQuery } from '../platform/useMediaQuery'
import './OrientationGuard.css'

const IS_PORTRAIT = ORIENTATION.startsWith('portrait')
const WRONG_ORIENTATION = IS_PORTRAIT ? 'landscape' : 'portrait'

export function OrientationGuard() {
  const isWrong = useMediaQuery(`(pointer: coarse) and (orientation: ${WRONG_ORIENTATION})`)
  if (!isWrong) return null

  return (
    <div className="orientation-guard">
      <div className="orientation-guard__phone" />
      <p>Otoč telefon {IS_PORTRAIT ? 'na výšku' : 'na šířku'}</p>
    </div>
  )
}
