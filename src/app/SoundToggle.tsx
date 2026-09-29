import './SoundToggle.css'

interface SoundToggleProps {
  soundOn: boolean
  onChange: (soundOn: boolean) => void
}

export function SoundToggle({ soundOn, onChange }: SoundToggleProps) {
  return (
    <button
      type="button"
      className={soundOn ? 'sound-toggle' : 'sound-toggle is-muted'}
      aria-label={soundOn ? 'Vypnout zvuk' : 'Zapnout zvuk'}
      aria-pressed={!soundOn}
      onClick={() => onChange(!soundOn)}
    >
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path className="sound-toggle__speaker" d="M4 12h5l7-6v20l-7-6H4z" />
        <path className="sound-toggle__waves" d="M20.5 11.5a6 6 0 0 1 0 9M24 8a11 11 0 0 1 0 16" />
        {!soundOn && (
          <>
            <path className="sound-toggle__strike-gap" d="M5 4 27 28" />
            <path className="sound-toggle__strike" d="M5 4 27 28" />
          </>
        )}
      </svg>
    </button>
  )
}
