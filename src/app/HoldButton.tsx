import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { vibrate } from '../platform/haptics'
import './HoldButton.css'

const BORDER_WIDTH = 2
const STROKE_WIDTH = 3
const FIRST_TICK_MS = 300
const MIN_TICK_INTERVAL_MS = 40
const TICK_MS = 20

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

  useEffect(() => {
    if (!holding) return
    const startedAt = performance.now()
    let timeout = 0
    const tick = () => {
      vibrate(TICK_MS)
      const remaining = 1 - (performance.now() - startedAt) / durationMs
      if (remaining <= 0) return
      timeout = window.setTimeout(tick, Math.max(MIN_TICK_INTERVAL_MS, FIRST_TICK_MS * remaining))
    }
    timeout = window.setTimeout(tick, FIRST_TICK_MS)
    return () => {
      clearTimeout(timeout)
      vibrate(0)
    }
  }, [holding, durationMs])

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
      onContextMenu={(event) => event.preventDefault()}
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
