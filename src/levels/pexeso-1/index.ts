import { lazy } from 'react'
import type { LevelDefinition } from '../../game/types'

export default {
  id: 'pexeso-1',
  name: 'Pexeso 1',
  component: lazy(() => import('./Pexeso1Level')),
} satisfies LevelDefinition
