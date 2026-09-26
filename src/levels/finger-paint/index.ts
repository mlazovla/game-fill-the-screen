import { lazy } from 'react'
import type { LevelDefinition } from '../../game/types'

export default {
  id: 'finger-paint',
  name: 'Malování prstem',
  component: lazy(() => import('./FingerPaintLevel')),
} satisfies LevelDefinition
