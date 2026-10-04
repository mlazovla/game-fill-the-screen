import { lazy } from 'react'
import type { LevelDefinition } from '../../game/types'

export default {
  id: 'size-pulse',
  name: 'Pulzující kolečko',
  component: lazy(() => import('./SizePulseLevel')),
  usesAudio: true,
} satisfies LevelDefinition
