import type { LevelProps } from '../../game/types'
import { SwipePexeso, type SwipePexesoConfig } from '../pexeso-common/SwipePexeso'
import { ALL_SYMBOLS, shuffle, type SymbolName } from '../pexeso-common/symbols'

function deal(): SymbolName[][] {
  for (;;) {
    const faces = shuffle([...ALL_SYMBOLS, ...ALL_SYMBOLS])
    const cards = ALL_SYMBOLS.map((_, i) => [faces[2 * i], faces[2 * i + 1]])
    if (cards.every(([horizontal, vertical]) => horizontal !== vertical)) return cards
  }
}

const CONFIG: SwipePexesoConfig = {
  className: 'pexeso-2',
  columns: 3,
  rows: 4,
  directions: [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ],
  faceOf: (direction) => (direction < 2 ? 0 : 1),
  lockPx: 10,
  deal,
}

export default function Pexeso2Level(props: LevelProps) {
  return <SwipePexeso {...props} config={CONFIG} />
}
