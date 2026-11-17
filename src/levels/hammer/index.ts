import { lazy } from 'react'
import type { LevelDefinition } from '../../game/types'

export default {
  id: 'hammer',
  name: 'Kladivo',
  component: lazy(() => import('./HammerLevel')),
  usesMotion: true,
  usesAudio: true,
} satisfies LevelDefinition
