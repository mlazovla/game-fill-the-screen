import { ORIENTATION } from '../config'
import { useMediaQuery } from '../platform/useMediaQuery'
import './OrientationGuard.css'

const WRONG_ORIENTATION = ORIENTATION === 'portrait' ? 'landscape' : 'portrait'

export function OrientationGuard() {
  const isWrong = useMediaQuery(`(pointer: coarse) and (orientation: ${WRONG_ORIENTATION})`)
  if (!isWrong) return null

  return (
    <div className="orientation-guard">
      <div className="orientation-guard__phone" />
      <p>Otoč telefon {ORIENTATION === 'portrait' ? 'na výšku' : 'na šířku'}</p>
    </div>
  )
}
