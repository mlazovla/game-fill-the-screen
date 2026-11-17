import { lazy } from 'react'
import type { LevelDefinition } from '../../game/types'

export default {
  id: 'pexeso-3',
  name: 'Pexeso 3',
  component: lazy(() => import('./Pexeso3Level')),
} satisfies LevelDefinition
