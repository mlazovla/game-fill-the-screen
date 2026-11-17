import type { ComponentType } from 'react'

export interface LevelProps {
  onProgress: (fillRatio: number) => void
  onComplete: () => void
  showUi: boolean
}

export interface LevelDefinition {
  id: string
  name: string
  component: ComponentType<LevelProps>
  usesMotion?: boolean
  usesAudio?: boolean
  usesMicrophone?: boolean
}
