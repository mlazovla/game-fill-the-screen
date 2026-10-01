import { lazy } from 'react'
import type { LevelDefinition } from '../../game/types'

export default {
  id: 'patience',
  name: 'Trpělivost',
  component: lazy(() => import('./PatienceLevel')),
} satisfies LevelDefinition
