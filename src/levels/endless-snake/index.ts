import { lazy } from 'react'
import type { LevelDefinition } from '../../game/types'

export default {
  id: 'endless-snake',
  name: 'Nekonečný had',
  component: lazy(() => import('./EndlessSnakeLevel')),
} satisfies LevelDefinition
