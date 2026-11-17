import type { LevelDefinition } from '../game/types'
import emberBlow from './ember-blow'
import endlessSnake from './endless-snake'
import fingerPaint from './finger-paint'
import jigsaw from './jigsaw'
import lamp from './lamp'
import patience from './patience'
import pexeso1 from './pexeso-1'
import pexeso2 from './pexeso-2'
import pexeso3 from './pexeso-3'
import pinchCircle from './pinch-circle'
import rainVessel from './rain-vessel'
import sixStripes from './six-stripes'
import sizePulse from './size-pulse'
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
  sizePulse,
  lamp,
  pexeso1,
  pexeso2,
  pexeso3,
]
