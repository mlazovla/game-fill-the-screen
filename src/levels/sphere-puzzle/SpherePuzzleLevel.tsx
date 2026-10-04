import { useEffect, useEffectEvent } from 'react'
import type { LevelProps } from '../../game/types'
import { useFullscreenCanvas } from '../../game/useFullscreenCanvas'
import { requestMotionPermission } from '../../platform/deviceGravity'
import { subscribeDeviceRotation, type DeviceAngles } from '../../platform/deviceRotation'
import { vibrate } from '../../platform/haptics'
import { keepScreenOn } from '../../platform/screen'
import { PIECE_COUNT, pieceOutlines, polygonArea } from './puzzle'
import { drawCross, drawDots, fillPolygons, projectWorldPiece, type Point, type Screen } from './render'
import { TouchLook } from './touchLook'
import { angleBetween, deviceView, rollAround, rollBetween, sphereDots, turnRight, type View } from './view'
import './SpherePuzzleLevel.css'

const DEG = Math.PI / 180
const DOT_SPACING_DEG = 10
const FOV = 50 * DEG
const TOLERANCE = 1.5 * DEG
const ROLL_TOLERANCE = 8 * DEG
const FIRST_OFFSET_DEG = 18
const ROLL_RANGES_DEG: [number, number][] = [
  [0, 0],
  [10, 20],
  [20, 40],
  [20, 40],
]
const SPAWN_SEARCH_STEP_DEG = 2
const SPAWN_MARGIN_DEG = 3
const FIRST_SPAWN_DELAY_S = 0.4
const NEXT_SPAWN_DELAY_S = 0.6
const HOLD_S = 0.5
const HAPTIC_MS = 12
const MAX_STEP_S = 0.1
const LOOSE_GRAY = 200

interface LoosePiece {
  pose: View
  hold: number
  fromSensor: boolean
}

const randomSign = () => (Math.random() < 0.5 ? -1 : 1)

function looseColor(hold: number) {
  const level = Math.round(LOOSE_GRAY + (255 - LOOSE_GRAY) * Math.min(1, hold / HOLD_S))
  return `rgb(${level}, ${level}, ${level})`
}

function isOnScreen(polygon: Point[], { width, height }: Screen) {
  if (polygon.length < 3) return false
  const xs = polygon.map((p) => p.x)
  const ys = polygon.map((p) => p.y)
  return Math.max(...xs) > 0 && Math.min(...xs) < width && Math.max(...ys) > 0 && Math.min(...ys) < height
}

function spawnPose(index: number, view: View, screen: Screen, outline: Point[]): View {
  const side = randomSign()
  if (index === 0) return turnRight(view, side * FIRST_OFFSET_DEG * DEG)

  const [minRoll, maxRoll] = ROLL_RANGES_DEG[index]
  const roll = randomSign() * (minRoll + Math.random() * (maxRoll - minRoll)) * DEG
  const poseAt = (deg: number) => rollAround(turnRight(view, side * deg * DEG), roll)
  for (let deg = 0; deg < 180; deg += SPAWN_SEARCH_STEP_DEG) {
    if (!isOnScreen(projectWorldPiece(screen, view, poseAt(deg), outline), screen)) {
      return poseAt(deg + SPAWN_MARGIN_DEG)
    }
  }
  return poseAt(180)
}

export default function SpherePuzzleLevel({ onProgress, onComplete }: LevelProps) {
  const canvasRef = useFullscreenCanvas('#000')

  const reportFill = useEffectEvent((ratio: number) => onProgress(ratio))
  const complete = useEffectEvent(() => onComplete())

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const dots = sphereDots(DOT_SPACING_DEG)
    const touch = new TouchLook()
    let sensed: DeviceAngles | null = null
    let loose: LoosePiece | null = null
    let placed = 0
    let nextSpawnAt = FIRST_SPAWN_DELAY_S
    let age = 0
    let last = performance.now()
    let frame = 0

    const screen = (): Screen => {
      const width = canvas.clientWidth
      return { width, height: canvas.clientHeight, focal: width / 2 / Math.tan(FOV / 2) }
    }
    const currentView = () => (sensed ? deviceView(sensed) : touch.view())

    const isAligned = (view: View, pose: View) => {
      if (angleBetween(view.forward, pose.forward) > TOLERANCE) return false
      return placed === 0 || Math.abs(rollBetween(view, pose)) <= ROLL_TOLERANCE
    }

    const loop = (now: number) => {
      const dt = Math.min(MAX_STEP_S, Math.max(0, (now - last) / 1000))
      last = now
      age += dt
      const view = currentView()
      const size = screen()
      const outlines = pieceOutlines(size.width, size.height)

      if (loose && sensed && !loose.fromSensor) loose = null
      if (!loose && placed < PIECE_COUNT && age >= nextSpawnAt) {
        loose = { pose: spawnPose(placed, view, size, outlines[placed]), hold: 0, fromSensor: sensed !== null }
      }

      if (loose) {
        loose.hold = Math.max(0, loose.hold + (isAligned(view, loose.pose) ? dt : -dt))
        if (loose.hold >= HOLD_S) {
          loose = null
          placed++
          nextSpawnAt = age + NEXT_SPAWN_DELAY_S
          vibrate(HAPTIC_MS)
          const area = outlines.slice(0, placed).reduce((sum, outline) => sum + polygonArea(outline), 0)
          reportFill(placed === PIECE_COUNT ? 1 : area / (size.width * size.height))
          if (placed === PIECE_COUNT) complete()
        }
      }

      const assembled = outlines.slice(0, placed)
      const loosePolygon = loose ? projectWorldPiece(size, view, loose.pose, outlines[placed]) : null
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, size.width, size.height)
      drawDots(ctx, size, view, dots, loosePolygon ? [...assembled, loosePolygon] : assembled)
      if (loose && loosePolygon) fillPolygons(ctx, [loosePolygon], looseColor(loose.hold))
      fillPolygons(ctx, assembled, '#fff')
      if (placed === 0) drawCross(ctx, size)
      frame = requestAnimationFrame(loop)
    }

    const unsubscribe = subscribeDeviceRotation((angles) => {
      sensed = angles
    })
    const toPoint = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      return { x: event.clientX - rect.left, y: event.clientY - rect.top }
    }
    const onPointerDown = (event: PointerEvent) => {
      canvas.setPointerCapture(event.pointerId)
      touch.down(event.pointerId, toPoint(event))
    }
    const onPointerMove = (event: PointerEvent) => touch.move(event.pointerId, toPoint(event), 1 / screen().focal)
    const onPointerEnd = (event: PointerEvent) => {
      touch.up(event.pointerId)
      void requestMotionPermission()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (touch.key(event.code)) event.preventDefault()
    }

    const releaseScreen = keepScreenOn()
    frame = requestAnimationFrame(loop)
    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', onPointerEnd)
    canvas.addEventListener('pointercancel', onPointerEnd)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      cancelAnimationFrame(frame)
      unsubscribe()
      releaseScreen()
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerEnd)
      canvas.removeEventListener('pointercancel', onPointerEnd)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [canvasRef])

  return <canvas ref={canvasRef} className="sphere-puzzle" />
}
