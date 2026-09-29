import { APP_NAME } from '../config'
import { HoldButton } from './HoldButton'
import { SoundToggle } from './SoundToggle'
import './StartScreen.css'

const RESTART_HOLD_MS = 3000

interface StartScreenProps {
  levelNumber: number
  levelName: string
  levelCount: number
  showUi: boolean
  onShowUiChange: (showUi: boolean) => void
  soundOn: boolean
  onSoundChange: (soundOn: boolean) => void
  onContinue: () => void
  onRestart: () => void
  onJumpToLevel: (index: number) => void
}

export function StartScreen({
  levelNumber,
  levelName,
  levelCount,
  showUi,
  onShowUiChange,
  soundOn,
  onSoundChange,
  onContinue,
  onRestart,
  onJumpToLevel,
}: StartScreenProps) {
  return (
    <div className="start-screen">
      <h1>{APP_NAME}</h1>
      <SoundToggle soundOn={soundOn} onChange={onSoundChange} />

      <button type="button" className="start-screen__continue" onClick={onContinue}>
        <span className="start-screen__continue-label">Pokračovat</span>
        <span className="start-screen__continue-level">level {levelNumber}</span>
      </button>
      {showUi && <p className="start-screen__hint">{levelName}</p>}

      <HoldButton durationMs={RESTART_HOLD_MS} onConfirm={onRestart}>
        Začít od začátku
      </HoldButton>

      <div className="start-screen__footer">
        {showUi && (
          <nav className="start-screen__levels" aria-label="Levely">
            {Array.from({ length: levelCount }, (_, index) => (
              <button
                key={index}
                type="button"
                className={index + 1 === levelNumber ? 'is-current' : undefined}
                onClick={() => onJumpToLevel(index)}
              >
                {index + 1}
              </button>
            ))}
          </nav>
        )}
        <label className="start-screen__option">
          <input type="checkbox" checked={showUi} onChange={(event) => onShowUiChange(event.target.checked)} />
          Zobrazit UI
        </label>
      </div>
    </div>
  )
}
