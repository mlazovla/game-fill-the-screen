interface ButtonProps {
  onClick: () => void
}

export function SkipButton({ onClick }: ButtonProps) {
  return (
    <button type="button" className="intro-skip" aria-label="Přeskočit" onClick={onClick}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 6 11 12 5 18M12 6 18 12 12 18" />
      </svg>
    </button>
  )
}

export function ContinueButton({ onClick }: ButtonProps) {
  return (
    <button type="button" className="intro-continue" onClick={onClick}>
      Pokračovat
    </button>
  )
}

export function ShakeIcon() {
  return (
    <svg className="intro-shake" viewBox="0 0 64 64" aria-hidden="true">
      <g className="intro-shake__device">
        <rect x="22" y="3" width="20" height="36" rx="4" />
        <g className="intro-shake__hand">
          <path d="M20 32h24a3 3 0 0 1 3 3v5a13 13 0 0 1-13 13h-4a13 13 0 0 1-13-13v-5a3 3 0 0 1 3-3zM26 50h12v14H26z" />
          <rect x="14" y="17" width="7" height="19" rx="3.5" transform="rotate(-18 17.5 26.5)" />
          <rect x="39" y="17" width="10" height="5.5" rx="2.75" />
          <rect x="39" y="23.5" width="11" height="5.5" rx="2.75" />
          <rect x="39" y="30" width="10" height="5.5" rx="2.75" />
        </g>
      </g>
      <path className="intro-shake__lines" d="M11 12q-4 7 0 14M6 9q-6 10 0 20M53 12q4 7 0 14M58 9q6 10 0 20" />
    </svg>
  )
}

export function MicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
      <rect x="23" y="4" width="18" height="34" rx="9" fill="currentColor" />
      <path d="M14 28a18 18 0 0 0 36 0M32 46v10M22 58h20" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  )
}
