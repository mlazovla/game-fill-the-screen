import { lazy } from 'react'
import type { LevelDefinition } from '../../game/types'

export default {
  id: 'rain-vessel',
  name: 'Déšť do nádoby',
  component: lazy(() => import('./RainVesselLevel')),
  usesMotion: true,
  usesAudio: true,
} satisfies LevelDefinition
