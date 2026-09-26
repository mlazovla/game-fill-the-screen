import { useEffect, useEffectEvent, useRef } from 'react'
import type { LevelProps } from '../../game/types'
import './PinchCircleLevel.css'

const START_RADIUS = 63
const PROGRESS_GRID = 32
const WHEEL_ZOOM_SPEED = 0.002

interface Point {
  x: number
  y: number
}

interface Circle extends Point {
  r: number
}

interface Pinch {
  distance: number
  midpoint: Point
  circle: Circle
}

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)
const midpoint = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

function coverage(circle: Circle, width: number, height: number) {
  let inside = 0
  for (let i = 0; i < PROGRESS_GRID; i++) {
    for (let j = 0; j < PROGRESS_GRID; j++) {
      const sample = { x: (i / (PROGRESS_GRID - 1)) * width, y: (j / (PROGRESS_GRID - 1)) * height }
      if (distance(sample, circle) <= circle.r) inside++
    }
  }
  return inside / PROGRESS_GRID ** 2
}

function coversRect(circle: Circle, width: number, height: number) {
  const corners = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: 0, y: height },
    { x: width, y: height },
  ]
  return corners.every((corner) => distance(corner, circle) <= circle.r)
}

export default function PinchCircleLevel({ onProgress, onComplete }: LevelProps) {
  const areaRef = useRef<HTMLDivElement>(null)
  const dotRef = useRef<HTMLDivElement>(null)

  const reportFill = useEffectEvent((ratio: number) => onProgress(ratio))
  const complete = useEffectEvent(() => onComplete())

  useEffect(() => {
    const area = areaRef.current
    const dot = dotRef.current
    if (!area || !dot) return

    let { width, height } = area.getBoundingClientRect()
    const circle: Circle = { x: width / 2, y: height / 2, r: START_RADIUS }
    const pointers = new Map<number, Point>()
    let pinch: Pinch | null = null
    let dragging = false
    let frame = 0
    let done = false

    const render = () => {
      frame = 0
      dot.style.width = `${circle.r * 2}px`
      dot.style.height = `${circle.r * 2}px`
      dot.style.transform = `translate(${circle.x - circle.r}px, ${circle.y - circle.r}px)`
      reportFill(coverage(circle, width, height))
      if (!done && coversRect(circle, width, height)) {
        done = true
        complete()
      }
    }

    const update = () => {
      circle.x = clamp(circle.x, 0, width)
      circle.y = clamp(circle.y, 0, height)
      if (!frame) frame = requestAnimationFrame(render)
    }

    const zoomAround = (origin: Point, from: Circle, scale: number) => {
      circle.r = Math.max(START_RADIUS, from.r * scale)
      const applied = circle.r / from.r
      circle.x = origin.x + (from.x - origin.x) * applied
      circle.y = origin.y + (from.y - origin.y) * applied
    }

    const toPoint = (event: PointerEvent | WheelEvent): Point => {
      const rect = area.getBoundingClientRect()
      return { x: event.clientX - rect.left, y: event.clientY - rect.top }
    }

    const startPinch = () => {
      const [a, b] = pointers.values()
      pinch = { distance: Math.max(1, distance(a, b)), midpoint: midpoint(a, b), circle: { ...circle } }
      dragging = false
    }

    const onPointerDown = (event: PointerEvent) => {
      if (done) return
      const point = toPoint(event)
      pointers.set(event.pointerId, point)
      if (pointers.size >= 2) startPinch()
      else dragging = distance(point, circle) <= circle.r
    }

    const onPointerMove = (event: PointerEvent) => {
      const previous = pointers.get(event.pointerId)
      if (!previous || done) return
      const point = toPoint(event)
      pointers.set(event.pointerId, point)

      if (pinch && pointers.size >= 2) {
        const [a, b] = pointers.values()
        const center = midpoint(a, b)
        zoomAround(pinch.midpoint, pinch.circle, distance(a, b) / pinch.distance)
        circle.x += center.x - pinch.midpoint.x
        circle.y += center.y - pinch.midpoint.y
        update()
      } else if (dragging) {
        circle.x += point.x - previous.x
        circle.y += point.y - previous.y
        update()
      }
    }

    const onPointerEnd = (event: PointerEvent) => {
      pointers.delete(event.pointerId)
      if (pointers.size >= 2) {
        startPinch()
      } else {
        pinch = null
        dragging = dragging || pointers.size === 1
      }
      if (pointers.size === 0) dragging = false
    }

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      if (done) return
      zoomAround(toPoint(event), { ...circle }, Math.exp(-event.deltaY * WHEEL_ZOOM_SPEED))
      update()
    }

    const observer = new ResizeObserver(() => {
      ;({ width, height } = area.getBoundingClientRect())
      update()
    })

    render()
    observer.observe(area)
    area.addEventListener('pointerdown', onPointerDown)
    area.addEventListener('pointermove', onPointerMove)
    area.addEventListener('pointerup', onPointerEnd)
    area.addEventListener('pointercancel', onPointerEnd)
    area.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      area.removeEventListener('pointerdown', onPointerDown)
      area.removeEventListener('pointermove', onPointerMove)
      area.removeEventListener('pointerup', onPointerEnd)
      area.removeEventListener('pointercancel', onPointerEnd)
      area.removeEventListener('wheel', onWheel)
    }
  }, [])

  return (
    <div ref={areaRef} className="pinch-circle">
      <div ref={dotRef} className="pinch-circle__dot" />
    </div>
  )
}
