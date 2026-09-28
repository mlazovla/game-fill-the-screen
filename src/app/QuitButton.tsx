import './QuitButton.css'

export const QUIT_BUTTON_VISIBLE_MS = 2000

interface QuitButtonProps {
  onQuit: () => void
}

export function QuitButton({ onQuit }: QuitButtonProps) {
  return (
    <button
      type="button"
      className="quit-button"
      aria-label="Zpět na úvodní obrazovku"
      style={{ animationDuration: `${QUIT_BUTTON_VISIBLE_MS}ms` }}
      onClick={onQuit}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 7 17 17M17 7 7 17" />
      </svg>
    </button>
  )
}
