import { lazy } from 'react'
import type { LevelDefinition } from '../../game/types'

export default {
  id: 'lamp',
  name: 'Lampička',
  component: lazy(() => import('./LampLevel')),
} satisfies LevelDefinition
