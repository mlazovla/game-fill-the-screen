import { lazy } from 'react'
import type { LevelDefinition } from '../../game/types'

export default {
  id: 'pinch-circle',
  name: 'Roztažení kolečka',
  component: lazy(() => import('./PinchCircleLevel')),
} satisfies LevelDefinition
