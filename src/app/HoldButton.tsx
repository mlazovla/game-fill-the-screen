import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import './HoldButton.css'

const BORDER_WIDTH = 2
const STROKE_WIDTH = 3

function pillPath(width: number, height: number) {
  const inset = STROKE_WIDTH / 2
  const radius = height / 2 - inset
  const left = inset + radius
  const right = width - inset - radius
  return [
    `M ${width / 2} ${inset}`,
    `H ${right}`,
    `A ${radius} ${radius} 0 0 1 ${right} ${height - inset}`,
    `H ${left}`,
    `A ${radius} ${radius} 0 0 1 ${left} ${inset}`,
    'Z',
  ].join(' ')
}

interface HoldButtonProps {
  durationMs: number
  onConfirm: () => void
  children: ReactNode
}

export function HoldButton({ durationMs, onConfirm, children }: HoldButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [holding, setHolding] = useState(false)

  useLayoutEffect(() => {
    const button = buttonRef.current
    if (!button) return
    const measure = () => setSize({ width: button.offsetWidth, height: button.offsetHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(button)
    return () => observer.disconnect()
  }, [])

  const release = () => setHolding(false)

  return (
    <button
      ref={buttonRef}
      type="button"
      className={holding ? 'hold-button is-holding' : 'hold-button'}
      style={{ '--hold-duration': `${durationMs}ms`, '--hold-border': `${BORDER_WIDTH}px` } as CSSProperties}
      onPointerDown={(event) => {
        if (event.button !== 0) return
        setHolding(true)
        event.currentTarget.setPointerCapture(event.pointerId)
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onTransitionEnd={(event) => {
        if (!holding || event.propertyName !== 'stroke-dashoffset') return
        setHolding(false)
        onConfirm()
      }}
    >
      {size.width > 0 && (
        <svg
          className="hold-button__progress"
          width={size.width}
          height={size.height}
          viewBox={`0 0 ${size.width} ${size.height}`}
          aria-hidden="true"
        >
          <path d={pillPath(size.width, size.height)} pathLength={1} strokeWidth={STROKE_WIDTH} />
        </svg>
      )}
      {children}
    </button>
  )
}
