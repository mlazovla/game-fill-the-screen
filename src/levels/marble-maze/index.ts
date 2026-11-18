import { lazy } from 'react'
import type { LevelDefinition } from '../../game/types'

export default {
  id: 'marble-maze',
  name: 'Kuličkový labyrint',
  component: lazy(() => import('./MarbleMazeLevel')),
  usesMotion: true,
  usesAudio: true,
} satisfies LevelDefinition
