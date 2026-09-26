import { Suspense, useState } from 'react'
import type { LevelDefinition } from './types'
import './LevelHost.css'

interface LevelHostProps {
  level: LevelDefinition
  number: number
  total: number
  onNext: () => void
  onRestart: () => void
}

export function LevelHost({ level, number, total, onNext, onRestart }: LevelHostProps) {
  const [fillRatio, setFillRatio] = useState(0)
  const [completed, setCompleted] = useState(false)
  const Level = level.component
  const isLast = number === total

  return (
    <main className="level-host">
      <Suspense fallback={null}>
        <Level onProgress={setFillRatio} onComplete={() => setCompleted(true)} />
      </Suspense>

      <header className="level-hud">
        <span>
          {number}/{total} · {level.name}
        </span>
        <span>{Math.floor(fillRatio * 100)} %</span>
      </header>

      {completed && (
        <div className="level-complete">
          <h2>Level dokončen</h2>
          {isLast && <p>To je zatím všechno.</p>}
          <div className="level-complete__actions">
            <button type="button" onClick={onRestart}>
              Znovu
            </button>
            <button type="button" className="primary" onClick={onNext}>
              {isLast ? 'Od začátku' : 'Další level'}
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
