import { ContinueButton } from './IntroControls'

export function GoalStep({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="intro-goal">
      <p className="intro-text">Cílem je vždy vyplnit celou obrazovku</p>
      <div className="intro-finish">
        <ContinueButton onClick={onContinue} />
      </div>
    </div>
  )
}
