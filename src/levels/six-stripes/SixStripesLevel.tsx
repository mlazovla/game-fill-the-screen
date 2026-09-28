import { useEffect, useEffectEvent, useRef } from 'react'
import { playPianoNote } from '../../game/piano'
import type { LevelProps } from '../../game/types'
import './SixStripesLevel.css'

const STRIPE_COUNT = 6
const HOLD_MS = 300
const FADE_MS = 1000
const TAP_MAX_MOVE = 24
const NOTES_BOTTOM_TO_TOP = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25]

type Stripe =
  | { state: 'black' }
  | { state: 'white'; holdUntil: number | null }
  | { state: 'fading'; fadeStart: number }

interface TouchStart {
  stripe: number
  x: number
  y: number
}

function brightness(stripe: Stripe, now: number) {
  if (stripe.state === 'white') return 1
  if (stripe.state === 'black') return 0
  return Math.max(0, 1 - (now - stripe.fadeStart) / FADE_MS)
}

export default function SixStripesLevel({ onProgress, onComplete }: LevelProps) {
  const areaRef = useRef<HTMLDivElement>(null)
  const stripeRefs = useRef<(HTMLDivElement | null)[]>([])

  const reportFill = useEffectEvent((ratio: number) => onProgress(ratio))
  const complete = useEffectEvent(() => onComplete())

  useEffect(() => {
    const area = areaRef.current
    if (!area) return

    const stripes: Stripe[] = Array.from({ length: STRIPE_COUNT }, () => ({ state: 'black' }))
    const shades = Array<number>(STRIPE_COUNT).fill(0)
    const touches = new Map<number, TouchStart>()
    let whiteCount = 0
    let frame = 0
    let done = false

    const stripeAt = (clientY: number) => {
      const rect = area.getBoundingClientRect()
      const index = Math.floor(((clientY - rect.top) / rect.height) * STRIPE_COUNT)
      return Math.min(STRIPE_COUNT - 1, Math.max(0, index))
    }

    const update = (now: number) => {
      const white = stripes.map((stripe) => stripe.state === 'white')
      const supported = (i: number) => (i === 0 || white[i - 1]) && (i === STRIPE_COUNT - 1 || white[i + 1])

      stripes.forEach((stripe, i) => {
        if (stripe.state === 'white') {
          if (supported(i)) stripe.holdUntil = null
          else if (stripe.holdUntil === null) stripe.holdUntil = now + HOLD_MS
          else if (now >= stripe.holdUntil) stripes[i] = { state: 'fading', fadeStart: stripe.holdUntil }
        } else if (stripe.state === 'fading' && now - stripe.fadeStart >= FADE_MS) {
          stripes[i] = { state: 'black' }
        }
      })
    }

    const render = (now: number) => {
      stripes.forEach((stripe, i) => {
        const shade = Math.round(brightness(stripe, now) * 255)
        const element = stripeRefs.current[i]
        if (element && shade !== shades[i]) {
          element.style.backgroundColor = `rgb(${shade} ${shade} ${shade})`
          shades[i] = shade
        }
      })

      const count = stripes.filter((stripe) => stripe.state === 'white').length
      if (count !== whiteCount) {
        whiteCount = count
        reportFill(count / STRIPE_COUNT)
      }
      if (!done && count === STRIPE_COUNT) {
        done = true
        complete()
      }
    }

    const loop = (now: number) => {
      if (!done) update(now)
      render(now)
      frame = requestAnimationFrame(loop)
    }

    const onPointerDown = (event: PointerEvent) => {
      touches.set(event.pointerId, { stripe: stripeAt(event.clientY), x: event.clientX, y: event.clientY })
    }

    const onPointerUp = (event: PointerEvent) => {
      const start = touches.get(event.pointerId)
      touches.delete(event.pointerId)
      if (!start || done) return
      const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y)
      if (moved > TAP_MAX_MOVE || stripeAt(event.clientY) !== start.stripe) return
      stripes[start.stripe] = { state: 'white', holdUntil: performance.now() + HOLD_MS }
      playPianoNote(NOTES_BOTTOM_TO_TOP[STRIPE_COUNT - 1 - start.stripe])
    }

    const onPointerCancel = (event: PointerEvent) => touches.delete(event.pointerId)

    frame = requestAnimationFrame(loop)
    area.addEventListener('pointerdown', onPointerDown)
    area.addEventListener('pointerup', onPointerUp)
    area.addEventListener('pointercancel', onPointerCancel)
    return () => {
      cancelAnimationFrame(frame)
      area.removeEventListener('pointerdown', onPointerDown)
      area.removeEventListener('pointerup', onPointerUp)
      area.removeEventListener('pointercancel', onPointerCancel)
    }
  }, [])

  return (
    <div ref={areaRef} className="six-stripes">
      {Array.from({ length: STRIPE_COUNT }, (_, i) => (
        <div
          key={i}
          ref={(element) => {
            stripeRefs.current[i] = element
          }}
          className="six-stripes__stripe"
        />
      ))}
    </div>
  )
}
