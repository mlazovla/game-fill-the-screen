import { useEffect, useEffectEvent, useRef } from 'react'
import type { LevelProps } from '../../game/types'
import { keepScreenOn } from '../../platform/screen'
import './PatienceLevel.css'

const FILL_SECONDS = 30
const MAX_FRAME_S = 0.1
const PROGRESS_GRID = 32

function coverage(radius: number, width: number, height: number) {
  let inside = 0
  for (let i = 0; i < PROGRESS_GRID; i++) {
    for (let j = 0; j < PROGRESS_GRID; j++) {
      const x = (i / (PROGRESS_GRID - 1) - 0.5) * width
      const y = (j / (PROGRESS_GRID - 1) - 0.5) * height
      if (Math.hypot(x, y) <= radius) inside++
    }
  }
  return inside / PROGRESS_GRID ** 2
}

export default function PatienceLevel({ onProgress, onComplete }: LevelProps) {
  const areaRef = useRef<HTMLDivElement>(null)
  const dotRef = useRef<HTMLDivElement>(null)

  const reportFill = useEffectEvent((ratio: number) => onProgress(ratio))
  const complete = useEffectEvent(() => onComplete())

  useEffect(() => {
    const area = areaRef.current
    const dot = dotRef.current
    if (!area || !dot) return

    let { width, height } = area.getBoundingClientRect()
    const pointers = new Set<number>()
    let elapsed = 0
    let lastTime = performance.now()
    let frame = 0

    const tick = (time: number) => {
      const dt = Math.min(MAX_FRAME_S, Math.max(0, (time - lastTime) / 1000))
      lastTime = time
      elapsed = pointers.size > 0 ? 0 : Math.min(FILL_SECONDS, elapsed + dt)

      const maxRadius = Math.hypot(width, height) / 2
      const radius = maxRadius * Math.sqrt(elapsed / FILL_SECONDS)
      dot.style.width = `${maxRadius * 2}px`
      dot.style.height = `${maxRadius * 2}px`
      dot.style.transform = `translate(-50%, -50%) scale(${radius / maxRadius})`
      reportFill(coverage(radius, width, height))

      if (elapsed >= FILL_SECONDS) complete()
      else frame = requestAnimationFrame(tick)
    }

    const onPointerDown = (event: PointerEvent) => {
      pointers.add(event.pointerId)
    }

    const onPointerEnd = (event: PointerEvent) => {
      pointers.delete(event.pointerId)
    }

    const observer = new ResizeObserver(() => {
      ;({ width, height } = area.getBoundingClientRect())
    })

    const releaseScreen = keepScreenOn()
    frame = requestAnimationFrame(tick)
    observer.observe(area)
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointerup', onPointerEnd)
    window.addEventListener('pointercancel', onPointerEnd)
    return () => {
      cancelAnimationFrame(frame)
      releaseScreen()
      observer.disconnect()
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointerup', onPointerEnd)
      window.removeEventListener('pointercancel', onPointerEnd)
    }
  }, [])

  return (
    <div ref={areaRef} className="patience">
      <div ref={dotRef} className="patience__dot" />
    </div>
  )
}
