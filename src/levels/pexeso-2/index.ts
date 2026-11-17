import { lazy } from 'react'
import type { LevelDefinition } from '../../game/types'

export default {
  id: 'pexeso-2',
  name: 'Pexeso 2',
  component: lazy(() => import('./Pexeso2Level')),
} satisfies LevelDefinition
