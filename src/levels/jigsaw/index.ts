import { lazy } from 'react'
import type { LevelDefinition } from '../../game/types'

export default {
  id: 'jigsaw',
  name: 'Puzzle',
  component: lazy(() => import('./JigsawLevel')),
} satisfies LevelDefinition
