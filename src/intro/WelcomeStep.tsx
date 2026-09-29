import { useRef, useState, type PointerEvent } from 'react'
import { enterImmersiveMode } from '../platform/screen'

const COMPLETE_RATIO = 0.33
const FLICK_PX_PER_MS = 0.6

type Motion = 'idle' | 'dragging' | 'closing' | 'returning'

interface Drag {
  pointerId: number
  startY: number
  lastY: number
  lastTime: number
  velocity: number
}

export function WelcomeStep({ onDone }: { onDone: () => void }) {
  const [pulled, setPulled] = useState(0)
  const [motion, setMotion] = useState<Motion>('idle')
  const dragRef = useRef<Drag | null>(null)

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current || motion === 'closing') return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY + pulled,
      lastY: event.clientY,
      lastTime: event.timeStamp,
      velocity: 0,
    }
    setMotion('dragging')
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const dt = event.timeStamp - drag.lastTime
    if (dt > 0) drag.velocity = (drag.lastY - event.clientY) / dt
    drag.lastY = event.clientY
    drag.lastTime = event.timeStamp
    setPulled(Math.min(event.currentTarget.clientHeight, Math.max(0, drag.startY - event.clientY)))
  }

  const onPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    dragRef.current = null
    void enterImmersiveMode()
    const height = event.currentTarget.clientHeight
    if (pulled >= height - 1) {
      onDone()
    } else if (pulled > height * COMPLETE_RATIO || drag.velocity > FLICK_PX_PER_MS) {
      setMotion('closing')
    } else {
      setMotion(pulled > 0 ? 'returning' : 'idle')
    }
  }

  const panelOffset = motion === 'closing' ? '0px' : motion === 'returning' ? '100%' : `calc(100% - ${pulled}px)`

  return (
    <div
      className="intro-welcome"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
    >
      <p className="intro-text">Vítej ve hře</p>
      {motion === 'idle' && <div className="intro-welcome__hint" />}
      <div
        className={motion === 'closing' || motion === 'returning' ? 'intro-welcome__panel is-animating' : 'intro-welcome__panel'}
        style={{ transform: `translateY(${panelOffset})` }}
        onTransitionEnd={() => {
          if (motion === 'closing') onDone()
          if (motion === 'returning') {
            setPulled(0)
            setMotion('idle')
          }
        }}
      />
    </div>
  )
}
