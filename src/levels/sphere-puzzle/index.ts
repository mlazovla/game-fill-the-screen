import { lazy } from 'react'
import type { LevelDefinition } from '../../game/types'

export default {
  id: 'sphere-puzzle',
  name: 'Koule',
  component: lazy(() => import('./SpherePuzzleLevel')),
  usesMotion: true,
} satisfies LevelDefinition
