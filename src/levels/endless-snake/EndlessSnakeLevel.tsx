import { useEffect, useEffectEvent } from 'react'
import type { LevelProps } from '../../game/types'
import { useFullscreenCanvas } from '../../game/useFullscreenCanvas'
import { COLUMNS, SnakeGame, VANISH_FADE_MS, type Direction } from './snake'
import './EndlessSnakeLevel.css'

const PX_PER_MM = 6.3
const BORDER_MM = 5
const GAP = 2
const SPAWN_FADE_MS = 120
const GAP_CLOSE_MS = 300
const SWIPE_MIN_PX = 24

const KEY_DIRECTIONS: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
}

interface Layout {
  left: number
  top: number
  cell: number
  rows: number
}

interface Gesture {
  x: number
  y: number
  swiped: boolean
}

function computeLayout(width: number, height: number): Layout {
  const border = BORDER_MM * PX_PER_MM
  const cell = (width - 2 * border) / COLUMNS
  const rows = Math.max(1, Math.floor((height - 2 * border) / cell))
  return { left: border, top: (height - rows * cell) / 2, cell, rows }
}

function draw(ctx: CanvasRenderingContext2D, game: SnakeGame, layout: Layout, width: number, height: number, now: number) {
  const { left, top, cell, rows } = layout
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = '#000'
  ctx.fillRect(left, top, cell * COLUMNS, cell * rows)

  const gap = game.phase === 'won' ? GAP * Math.max(0, 1 - (now - game.wonAt) / GAP_CLOSE_MS) : GAP
  const last = game.body.length - 1
  game.body.forEach((segment, index) => {
    let alpha = Math.min(1, (now - segment.born) / SPAWN_FADE_MS)
    if (game.phase === 'vanishing') {
      const fadeStart = game.crashedAt + (last - index) * game.vanishStagger
      alpha = Math.min(alpha, 1 - Math.max(0, (now - fadeStart) / VANISH_FADE_MS))
    }
    if (alpha <= 0) return
    ctx.fillStyle = `rgb(255 255 255 / ${alpha})`
    ctx.fillRect(left + segment.col * cell + gap, top + segment.row * cell + gap, cell - 2 * gap, cell - 2 * gap)
  })
}

function swipeDirection(dx: number, dy: number): Direction {
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left'
  return dy > 0 ? 'down' : 'up'
}

export default function EndlessSnakeLevel({ onProgress, onComplete }: LevelProps) {
  const canvasRef = useFullscreenCanvas('#fff')

  const reportFill = useEffectEvent((ratio: number) => onProgress(ratio))
  const complete = useEffectEvent(() => onComplete())

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    let layout = computeLayout(canvas.clientWidth, canvas.clientHeight)
    let game = new SnakeGame(layout.rows, performance.now())
    const gestures = new Map<number, Gesture>()
    let reportedLength = -1
    let completed = false
    let frame = 0

    const loop = (now: number) => {
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      const next = computeLayout(width, height)
      if (next.rows !== layout.rows) game = new SnakeGame(next.rows, now)
      layout = next

      game.update(now)
      draw(ctx, game, layout, width, height, now)

      if (game.body.length !== reportedLength) {
        reportedLength = game.body.length
        reportFill(game.fillRatio)
      }
      if (game.phase === 'won' && !completed) {
        completed = true
        complete()
      }
      frame = requestAnimationFrame(loop)
    }

    const onPointerDown = (event: PointerEvent) => {
      gestures.set(event.pointerId, { x: event.clientX, y: event.clientY, swiped: false })
      game.touch(performance.now())
    }

    const onPointerMove = (event: PointerEvent) => {
      const gesture = gestures.get(event.pointerId)
      if (!gesture || gesture.swiped) return
      const dx = event.clientX - gesture.x
      const dy = event.clientY - gesture.y
      if (Math.hypot(dx, dy) < SWIPE_MIN_PX) return
      gesture.swiped = true
      game.swipe(swipeDirection(dx, dy), performance.now())
    }

    const onPointerEnd = (event: PointerEvent) => gestures.delete(event.pointerId)

    const onKeyDown = (event: KeyboardEvent) => {
      const direction = KEY_DIRECTIONS[event.key]
      if (!direction) return
      event.preventDefault()
      game.swipe(direction, performance.now())
    }

    frame = requestAnimationFrame(loop)
    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', onPointerEnd)
    canvas.addEventListener('pointercancel', onPointerEnd)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      cancelAnimationFrame(frame)
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerEnd)
      canvas.removeEventListener('pointercancel', onPointerEnd)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [canvasRef])

  return <canvas ref={canvasRef} className="endless-snake" />
}
