import type { LevelDefinition } from '../game/types'
import emberBlow from './ember-blow'
import endlessSnake from './endless-snake'
import fingerPaint from './finger-paint'
import jigsaw from './jigsaw'
import patience from './patience'
import pinchCircle from './pinch-circle'
import rainVessel from './rain-vessel'
import sixStripes from './six-stripes'
import spherePuzzle from './sphere-puzzle'

export const levels: LevelDefinition[] = [
  fingerPaint,
  pinchCircle,
  sixStripes,
  rainVessel,
  endlessSnake,
  emberBlow,
  jigsaw,
  patience,
  spherePuzzle,
]
