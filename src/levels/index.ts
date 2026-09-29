import type { LevelDefinition } from '../game/types'
import endlessSnake from './endless-snake'
import fingerPaint from './finger-paint'
import pinchCircle from './pinch-circle'
import rainVessel from './rain-vessel'
import sixStripes from './six-stripes'

export const levels: LevelDefinition[] = [
  fingerPaint,
  pinchCircle,
  sixStripes,
  rainVessel,
  endlessSnake,
]
