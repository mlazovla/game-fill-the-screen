import { Suspense, useState } from 'react'
import type { LevelDefinition } from './types'
import './LevelHost.css'

interface LevelHostProps {
  level: LevelDefinition
  number: number
  total: number
  showUi: boolean
  onComplete: () => void
}

export function LevelHost({ level, number, total, showUi, onComplete }: LevelHostProps) {
  const [fillRatio, setFillRatio] = useState(0)
  const Level = level.component

  return (
    <main className="level-host">
      <Suspense fallback={null}>
        <Level onProgress={setFillRatio} onComplete={onComplete} />
      </Suspense>

      {showUi && (
        <header className="level-hud">
          <span>
            {number}/{total} · {level.name}
          </span>
          <span>{Math.floor(fillRatio * 100)} %</span>
        </header>
      )}
    </main>
  )
}
