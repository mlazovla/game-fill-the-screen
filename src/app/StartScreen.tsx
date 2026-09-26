import { APP_NAME } from '../config'
import { HoldButton } from './HoldButton'
import './StartScreen.css'

const RESTART_HOLD_MS = 3000

interface StartScreenProps {
  levelNumber: number
  levelName: string
  showUi: boolean
  onShowUiChange: (showUi: boolean) => void
  onContinue: () => void
  onRestart: () => void
}

export function StartScreen({
  levelNumber,
  levelName,
  showUi,
  onShowUiChange,
  onContinue,
  onRestart,
}: StartScreenProps) {
  return (
    <div className="start-screen">
      <h1>{APP_NAME}</h1>

      <button type="button" className="start-screen__continue" onClick={onContinue}>
        <span className="start-screen__continue-label">Pokračovat</span>
        <span className="start-screen__continue-level">level {levelNumber}</span>
      </button>
      {showUi && <p className="start-screen__hint">{levelName}</p>}

      <HoldButton durationMs={RESTART_HOLD_MS} onConfirm={onRestart}>
        Začít od začátku
      </HoldButton>

      <label className="start-screen__option">
        <input type="checkbox" checked={showUi} onChange={(event) => onShowUiChange(event.target.checked)} />
        Zobrazit UI
      </label>
    </div>
  )
}
