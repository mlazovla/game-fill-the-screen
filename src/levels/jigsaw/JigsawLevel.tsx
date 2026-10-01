import { useEffect, useEffectEvent } from 'react'
import type { LevelProps } from '../../game/types'
import { useFullscreenCanvas } from '../../game/useFullscreenCanvas'
import { vibrate } from '../../platform/haptics'
import { COLUMNS, pieceOutline, randomTabs, ROWS, type Point } from './puzzle'
import './JigsawLevel.css'

const PX_PER_MM = 6.3
const SNAP_MM = 1.5
const SNAP_EASE = 30
const SNAP_DONE_PX = 0.3
const SEAM_PX = 1.5
const HAPTIC_MS = 12
const MAX_STEP_S = 0.05

interface Piece {
  column: number
  row: number
  x: number
  y: number
  target: Point | null
  path: Path2D
}

interface Drag {
  piece: Piece
  offsetX: number
  offsetY: number
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

function shuffle<T>(items: T[]) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[items[i], items[j]] = [items[j], items[i]]
  }
  return items
}

function toPath(outline: Point[]) {
  const path = new Path2D()
  path.moveTo(outline[0].x, outline[0].y)
  for (const point of outline.slice(1)) path.lineTo(point.x, point.y)
  path.closePath()
  return path
}

export default function JigsawLevel({ onProgress, onComplete }: LevelProps) {
  const canvasRef = useFullscreenCanvas('#000')

  const reportFill = useEffectEvent((ratio: number) => onProgress(ratio))
  const complete = useEffectEvent(() => onComplete())

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    const hit = document.createElement('canvas').getContext('2d')
    if (!canvas || !ctx || !hit) return

    const tabs = randomTabs()
    const cells = Array.from({ length: COLUMNS * ROWS }, (_, i) => ({ column: i % COLUMNS, row: Math.floor(i / COLUMNS) }))
    const pieces: Piece[] = shuffle(cells).map(({ column, row }) => ({
      column,
      row,
      x: (COLUMNS - 1) / 2,
      y: (ROWS - 1) / 2,
      target: null,
      path: new Path2D(),
    }))
    const drags = new Map<number, Drag>()
    let cellWidth = 0
    let cellHeight = 0
    let reportedCorrect = -1
    let completed = false
    let last = performance.now()
    let frame = 0

    const resize = () => {
      const width = canvas.clientWidth / COLUMNS
      const height = canvas.clientHeight / ROWS
      if (width === cellWidth && height === cellHeight) return
      cellWidth = width
      cellHeight = height
      for (const piece of pieces) piece.path = toPath(pieceOutline(piece.column, piece.row, width, height, tabs))
    }

    const isHeld = (piece: Piece) => [...drags.values()].some((drag) => drag.piece === piece)
    const isCorrect = (piece: Piece) => !piece.target && !isHeld(piece) && piece.x === piece.column && piece.y === piece.row

    const toPoint = (event: PointerEvent): Point => {
      const rect = canvas.getBoundingClientRect()
      return { x: event.clientX - rect.left, y: event.clientY - rect.top }
    }

    const pieceAt = (point: Point) => {
      for (let i = pieces.length - 1; i >= 0; i--) {
        const piece = pieces[i]
        if (hit.isPointInPath(piece.path, point.x - piece.x * cellWidth, point.y - piece.y * cellHeight)) return piece
      }
      return null
    }

    const snap = (piece: Piece) => {
      const snapPx = SNAP_MM * PX_PER_MM
      for (let row = 0; row < ROWS; row++) {
        for (let column = 0; column < COLUMNS; column++) {
          if (Math.hypot((piece.x - column) * cellWidth, (piece.y - row) * cellHeight) > snapPx) continue
          piece.target = { x: column, y: row }
          pieces.splice(pieces.indexOf(piece), 1)
          pieces.unshift(piece)
          vibrate(HAPTIC_MS)
          return
        }
      }
    }

    const onPointerDown = (event: PointerEvent) => {
      if (completed) return
      const point = toPoint(event)
      const piece = pieceAt(point)
      if (!piece || isHeld(piece)) return
      canvas.setPointerCapture(event.pointerId)
      pieces.splice(pieces.indexOf(piece), 1)
      pieces.push(piece)
      piece.target = null
      drags.set(event.pointerId, {
        piece,
        offsetX: point.x - piece.x * cellWidth,
        offsetY: point.y - piece.y * cellHeight,
      })
    }

    const onPointerMove = (event: PointerEvent) => {
      const drag = drags.get(event.pointerId)
      if (!drag) return
      const point = toPoint(event)
      drag.piece.x = clamp((point.x - drag.offsetX) / cellWidth, -0.5, COLUMNS - 0.5)
      drag.piece.y = clamp((point.y - drag.offsetY) / cellHeight, -0.5, ROWS - 0.5)
    }

    const onPointerEnd = (event: PointerEvent) => {
      const drag = drags.get(event.pointerId)
      if (!drag) return
      drags.delete(event.pointerId)
      snap(drag.piece)
    }

    const loop = (now: number) => {
      const dt = Math.min(MAX_STEP_S, Math.max(0, (now - last) / 1000))
      last = now
      resize()

      const ease = 1 - Math.exp(-SNAP_EASE * dt)
      for (const piece of pieces) {
        if (!piece.target) continue
        piece.x += (piece.target.x - piece.x) * ease
        piece.y += (piece.target.y - piece.y) * ease
        if (Math.hypot((piece.target.x - piece.x) * cellWidth, (piece.target.y - piece.y) * cellHeight) < SNAP_DONE_PX) {
          piece.x = piece.target.x
          piece.y = piece.target.y
          piece.target = null
        }
      }

      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight)
      ctx.fillStyle = '#fff'
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = SEAM_PX
      for (const piece of pieces) {
        ctx.save()
        ctx.translate(piece.x * cellWidth, piece.y * cellHeight)
        ctx.fill(piece.path)
        ctx.stroke(piece.path)
        ctx.restore()
      }

      const correct = pieces.filter(isCorrect).length
      if (correct !== reportedCorrect) {
        reportedCorrect = correct
        reportFill(correct / pieces.length)
      }
      if (correct === pieces.length && !completed) {
        completed = true
        complete()
      }
      frame = requestAnimationFrame(loop)
    }

    frame = requestAnimationFrame(loop)
    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', onPointerEnd)
    canvas.addEventListener('pointercancel', onPointerEnd)
    return () => {
      cancelAnimationFrame(frame)
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerEnd)
      canvas.removeEventListener('pointercancel', onPointerEnd)
    }
  }, [canvasRef])

  return <canvas ref={canvasRef} className="jigsaw" />
}
