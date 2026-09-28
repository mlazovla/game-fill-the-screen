import { lazy } from 'react'
import type { LevelDefinition } from '../../game/types'

export default {
  id: 'six-stripes',
  name: 'Šest proužků',
  component: lazy(() => import('./SixStripesLevel')),
} satisfies LevelDefinition
