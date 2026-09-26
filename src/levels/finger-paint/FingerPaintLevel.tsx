import { useEffect, useEffectEvent } from 'react'
import { createFillMeter } from '../../game/fillMeter'
import type { LevelProps } from '../../game/types'
import { useFullscreenCanvas } from '../../game/useFullscreenCanvas'
import './FingerPaintLevel.css'

const START_COLOR = '#000000'
const PAINT_COLOR = '#ffffff'
const BRUSH_SIZE = 44
const TARGET_FILL = 0.98
const MEASURE_INTERVAL_MS = 120

interface Point {
  x: number
  y: number
}

export default function FingerPaintLevel({ onProgress, onComplete }: LevelProps) {
  const canvasRef = useFullscreenCanvas(START_COLOR)

  const reportFill = useEffectEvent((ratio: number) => onProgress(ratio))
  const complete = useEffectEvent(() => onComplete())

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const measureFill = createFillMeter(START_COLOR)
    const lastPoints = new Map<number, Point>()
    let lastMeasure = 0
    let done = false

    const toPoint = (event: PointerEvent): Point => {
      const rect = canvas.getBoundingClientRect()
      return { x: event.clientX - rect.left, y: event.clientY - rect.top }
    }

    const dot = (p: Point) => {
      ctx.fillStyle = PAINT_COLOR
      ctx.beginPath()
      ctx.arc(p.x, p.y, BRUSH_SIZE / 2, 0, Math.PI * 2)
      ctx.fill()
    }

    const line = (from: Point, to: Point) => {
      ctx.strokeStyle = PAINT_COLOR
      ctx.lineWidth = BRUSH_SIZE
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(from.x, from.y)
      ctx.lineTo(to.x, to.y)
      ctx.stroke()
    }

    const measure = (force = false) => {
      const now = performance.now()
      if (done || (!force && now - lastMeasure < MEASURE_INTERVAL_MS)) return
      lastMeasure = now
      const ratio = measureFill(canvas)
      reportFill(ratio)
      if (ratio >= TARGET_FILL) {
        done = true
        complete()
      }
    }

    const onPointerDown = (event: PointerEvent) => {
      canvas.setPointerCapture(event.pointerId)
      const point = toPoint(event)
      lastPoints.set(event.pointerId, point)
      dot(point)
      measure()
    }

    const onPointerMove = (event: PointerEvent) => {
      let previous = lastPoints.get(event.pointerId)
      if (!previous) return
      const coalesced = event.getCoalescedEvents?.() ?? []
      for (const sample of coalesced.length ? coalesced : [event]) {
        const point = toPoint(sample)
        line(previous, point)
        previous = point
      }
      lastPoints.set(event.pointerId, previous)
      measure()
    }

    const onPointerEnd = (event: PointerEvent) => {
      lastPoints.delete(event.pointerId)
      measure(true)
    }

    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', onPointerEnd)
    canvas.addEventListener('pointercancel', onPointerEnd)
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerEnd)
      canvas.removeEventListener('pointercancel', onPointerEnd)
    }
  }, [canvasRef])

  return <canvas ref={canvasRef} className="finger-paint" />
}
