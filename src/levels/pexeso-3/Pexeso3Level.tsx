import type { LevelProps } from '../../game/types'
import { SwipePexeso, type SwipePexesoConfig } from '../pexeso-common/SwipePexeso'
import { ALL_SYMBOLS, shuffle } from '../pexeso-common/symbols'
import './Pexeso3Level.css'

const DIRECTION_COUNT = 8
const CARD_COUNT = 2

function deal() {
  const picked = shuffle([...ALL_SYMBOLS]).slice(0, DIRECTION_COUNT)
  return Array.from({ length: CARD_COUNT }, () => shuffle([...picked]))
}

const CONFIG: SwipePexesoConfig = {
  className: 'pexeso-3',
  columns: 1,
  rows: CARD_COUNT,
  directions: Array.from({ length: DIRECTION_COUNT }, (_, i) => {
    const angle = (i * 2 * Math.PI) / DIRECTION_COUNT - Math.PI / 2
    return { x: Math.round(Math.cos(angle) * 1e6) / 1e6, y: Math.round(Math.sin(angle) * 1e6) / 1e6 }
  }),
  faceOf: (direction) => direction,
  lockPx: 15,
  deal,
}

export default function Pexeso3Level(props: LevelProps) {
  return <SwipePexeso {...props} config={CONFIG} />
}
