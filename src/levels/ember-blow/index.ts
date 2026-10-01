import { lazy } from 'react'
import type { LevelDefinition } from '../../game/types'

export default {
  id: 'ember-blow',
  name: 'Rozfoukávání uhlíků',
  component: lazy(() => import('./EmberBlowLevel')),
  usesMicrophone: true,
} satisfies LevelDefinition
