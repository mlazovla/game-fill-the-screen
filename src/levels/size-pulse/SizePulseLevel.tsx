import { useEffect, useEffectEvent, useRef } from 'react'
import { centeredCircleCoverage } from '../../game/circleCoverage'
import type { LevelProps } from '../../game/types'
import { startPulseTone } from './sound'
import './SizePulseLevel.css'

const START_RADIUS = 32
const PERIOD_S = 2
const GROWTH_WAVES = 6
const PERFECT_GAIN = 2 * GROWTH_WAVES - 1
const TARGET_MARGIN = 1.03
const MIN_SCALE = 0.5
const MAX_FRAME_S = 0.1
const BASE_FREQUENCY = 220
const SIZE_PITCH_EXPONENT = 0.5
const WAVE_SWING_SEMITONES = 4

const wave = (time: number) => Math.sin((2 * Math.PI * time) / PERIOD_S)

export default function SizePulseLevel({ onProgress, onComplete }: LevelProps) {
  const areaRef = useRef<HTMLDivElement>(null)
  const dotRef = useRef<HTMLDivElement>(null)

  const reportFill = useEffectEvent((ratio: number) => onProgress(ratio))
  const complete = useEffectEvent(() => onComplete())

  useEffect(() => {
    const area = areaRef.current
    const dot = dotRef.current
    if (!area || !dot) return

    let { width, height } = area.getBoundingClientRect()
    const pointers = new Map<number, { x: number; y: number }>()
    const tone = startPulseTone()
    let time = 0
    let logScale = 0
    let lastTime = performance.now()
    let frame = 0

    const tick = (now: number) => {
      const dt = Math.min(MAX_FRAME_S, Math.max(0, (now - lastTime) / 1000))
      lastTime = now
      const previous = wave(time)
      time += dt

      const target = Math.hypot(width, height) / 2
      const pulse = Math.log((target * TARGET_MARGIN) / START_RADIUS) / PERFECT_GAIN
      if (pointers.size === 0) {
        logScale = Math.max(Math.log(MIN_SCALE), logScale + pulse * (wave(time) - previous))
      }

      const radius = START_RADIUS * Math.exp(logScale)
      const center = { x: width / 2, y: height / 2 }
      const onCircle = [...pointers.values()].some((p) => Math.hypot(p.x - center.x, p.y - center.y) <= radius)
      const frequency =
        BASE_FREQUENCY * (radius / START_RADIUS) ** SIZE_PITCH_EXPONENT * 2 ** ((wave(time) * WAVE_SWING_SEMITONES) / 12)
      tone.update(frequency, onCircle)
      dot.style.width = `${target * 2}px`
      dot.style.height = `${target * 2}px`
      dot.style.transform = `translate(-50%, -50%) scale(${radius / target})`
      reportFill(centeredCircleCoverage(radius, width, height))

      if (radius >= target) {
        tone.stop()
        complete()
      } else {
        frame = requestAnimationFrame(tick)
      }
    }

    const toPoint = (event: PointerEvent) => {
      const rect = area.getBoundingClientRect()
      return { x: event.clientX - rect.left, y: event.clientY - rect.top }
    }

    const onPointerDown = (event: PointerEvent) => {
      pointers.set(event.pointerId, toPoint(event))
    }

    const onPointerMove = (event: PointerEvent) => {
      if (pointers.has(event.pointerId)) pointers.set(event.pointerId, toPoint(event))
    }

    const onPointerEnd = (event: PointerEvent) => {
      pointers.delete(event.pointerId)
    }

    const preventLongPress = (event: TouchEvent) => event.preventDefault()

    const observer = new ResizeObserver(() => {
      ;({ width, height } = area.getBoundingClientRect())
    })

    frame = requestAnimationFrame(tick)
    observer.observe(area)
    area.addEventListener('touchstart', preventLongPress, { passive: false })
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerEnd)
    window.addEventListener('pointercancel', onPointerEnd)
    return () => {
      cancelAnimationFrame(frame)
      tone.stop()
      observer.disconnect()
      area.removeEventListener('touchstart', preventLongPress)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerEnd)
      window.removeEventListener('pointercancel', onPointerEnd)
    }
  }, [])

  return (
    <div ref={areaRef} className="size-pulse">
      <div ref={dotRef} className="size-pulse__dot" />
    </div>
  )
}
