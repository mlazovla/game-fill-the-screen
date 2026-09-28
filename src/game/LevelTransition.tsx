import type { AnimationEvent } from 'react'
import './LevelTransition.css'

export type TransitionPhase = 'covering' | 'title' | 'waiting' | 'revealing'

interface LevelTransitionProps {
  phase: TransitionPhase
  levelNumber: number | null
  onCovered: () => void
  onTitleShown: () => void
  onContinue: () => void
  onRevealed: () => void
}

const ownAnimation = (event: AnimationEvent) => event.target === event.currentTarget

export function LevelTransition({
  phase,
  levelNumber,
  onCovered,
  onTitleShown,
  onContinue,
  onRevealed,
}: LevelTransitionProps) {
  return (
    <div
      className={`level-transition is-${phase}`}
      onClick={phase === 'waiting' ? onContinue : undefined}
      onAnimationEnd={(event) => {
        if (!ownAnimation(event)) return
        if (phase === 'covering') onCovered()
        if (phase === 'revealing') onRevealed()
      }}
    >
      {phase !== 'covering' && (
        <div
          className="level-transition__title"
          onAnimationEnd={(event) => {
            if (ownAnimation(event) && phase === 'title') onTitleShown()
          }}
        >
          {levelNumber === null ? (
            <div className="level-transition__end">A to je vše</div>
          ) : (
            <>
              <div className="level-transition__word">
                <svg viewBox="0 0 300 100" preserveAspectRatio="none" aria-hidden="true">
                  <text x="0" y="100" fontSize="140" textLength="300" lengthAdjust="spacingAndGlyphs">
                    LEVEL
                  </text>
                </svg>
              </div>
              <div className="level-transition__number">{levelNumber}</div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
