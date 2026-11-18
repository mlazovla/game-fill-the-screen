import { useEffect, useEffectEvent } from 'react'
import type { LevelProps } from '../../game/types'
import { useFullscreenCanvas } from '../../game/useFullscreenCanvas'
import { requestMotionPermission, subscribeGravity } from '../../platform/deviceGravity'
import { vibrate } from '../../platform/haptics'
import { ARCS, BALL_RADIUS, CORRIDORS, corridorAt, RING_RADII, SPOKE_SEGMENTS, START, WALL, type Vec } from './maze'
import { stepBall, type Ball } from './physics'
import { playClick } from './sound'
import './MarbleMazeLevel.css'

const MAX_STEP_S = 0.05
const SENSOR_SMOOTHING = 12
const POINTER_TILT = 0.3
const VIEW_MARGIN = 0.94
const ZOOM_RATE = 2.5
const CUP_REACH = 0.5
const SETTLE_SPEED = 0.6
const SETTLE_S = 0.3
const FINAL_ZOOM_S = 1.6
const FINAL_OVERSCAN = 1.05
const CENTERING_RATE = 8
const IMPACT_MIN = 3
const IMPACT_FULL = 20
const HAPTIC_COOLDOWN_MS = 70
const WALL_COLOR = '#aaa'

export default function MarbleMazeLevel({ onProgress, onComplete }: LevelProps) {
  const canvasRef = useFullscreenCanvas('#000')

  const reportFill = useEffectEvent((ratio: number) => onProgress(ratio))
  const complete = useEffectEvent(() => onComplete())

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const ball: Ball = { position: { ...START }, velocity: { x: 0, y: 0 } }
    const tilt: Vec = { x: 0, y: 0 }
    let sensed: Vec = { x: 0, y: 0 }
    let hasSensor = false
    let corridor = CORRIDORS - 1
    let scale = 0
    let settled = 0
    let finalFrom = 0
    let finalElapsed = -1
    let finished = false
    let lastHaptic = 0
    let reportedPercent = -1
    let last = performance.now()
    let frame = 0

    const fitScale = (width: number, height: number, radius: number) =>
      ((Math.min(width, height) / 2) * VIEW_MARGIN) / (radius + WALL / 2)

    const feelImpact = (impact: number, now: number) => {
      if (impact < IMPACT_MIN || now - lastHaptic < HAPTIC_COOLDOWN_MS) return
      lastHaptic = now
      const strength = Math.min(1, impact / IMPACT_FULL)
      vibrate(Math.round(6 + 20 * strength))
      playClick(strength)
    }

    const draw = (width: number, height: number) => {
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, width, height)
      ctx.save()
      ctx.translate(width / 2, height / 2)
      ctx.scale(scale, scale)
      ctx.strokeStyle = WALL_COLOR
      ctx.lineWidth = WALL
      ctx.lineCap = 'round'
      ctx.beginPath()
      for (const arc of ARCS) {
        ctx.moveTo(arc.radius * Math.cos(arc.start), arc.radius * Math.sin(arc.start))
        ctx.arc(0, 0, arc.radius, arc.start, arc.end)
      }
      for (const { a, b } of SPOKE_SEGMENTS) {
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
      }
      ctx.stroke()
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(ball.position.x, ball.position.y, BALL_RADIUS, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    const loop = (now: number) => {
      const dt = Math.min(MAX_STEP_S, Math.max(0, (now - last) / 1000))
      last = now
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      const finalScale = (Math.hypot(width, height) / 2 / BALL_RADIUS) * FINAL_OVERSCAN

      if (finalElapsed < 0) {
        const blend = 1 - Math.exp(-SENSOR_SMOOTHING * dt)
        tilt.x += (sensed.x - tilt.x) * blend
        tilt.y += (sensed.y - tilt.y) * blend
        feelImpact(stepBall(ball, tilt, dt), now)

        const distance = Math.hypot(ball.position.x, ball.position.y)
        corridor = corridorAt(distance, corridor)
        const speed = Math.hypot(ball.velocity.x, ball.velocity.y)
        settled = distance < CUP_REACH && speed < SETTLE_SPEED ? settled + dt : 0

        const target = fitScale(width, height, RING_RADII[corridor])
        scale = scale > 0 ? Math.exp(Math.log(scale) + (Math.log(target) - Math.log(scale)) * (1 - Math.exp(-ZOOM_RATE * dt))) : target
        if (settled >= SETTLE_S) {
          finalElapsed = 0
          finalFrom = scale
          vibrate(40)
        }
      } else {
        finalElapsed += dt
        const t = Math.min(1, finalElapsed / FINAL_ZOOM_S)
        const eased = t * t * t
        scale = Math.exp(Math.log(finalFrom) + (Math.log(finalScale) - Math.log(finalFrom)) * eased)
        const pull = Math.exp(-CENTERING_RATE * dt)
        ball.position.x *= pull
        ball.position.y *= pull
        if (t >= 1 && !finished) {
          finished = true
          complete()
        }
      }

      draw(width, height)

      const ballOnScreen = BALL_RADIUS * scale
      const fill = finished ? 1 : Math.min(1, (Math.PI * ballOnScreen * ballOnScreen) / (width * height))
      const percent = Math.floor(fill * 100)
      if (percent !== reportedPercent) {
        reportedPercent = percent
        reportFill(fill)
      }
      if (!finished) frame = requestAnimationFrame(loop)
    }

    const unsubscribe = subscribeGravity((gravity) => {
      hasSensor = true
      sensed = { x: gravity.x, y: gravity.y }
    })

    const steerByPointer = (event: PointerEvent) => {
      if (hasSensor) return
      const rect = canvas.getBoundingClientRect()
      const radius = Math.min(rect.width, rect.height) / 2
      const x = (event.clientX - rect.left - rect.width / 2) / radius
      const y = (event.clientY - rect.top - rect.height / 2) / radius
      const length = Math.max(1, Math.hypot(x, y))
      sensed = { x: (x / length) * POINTER_TILT, y: (y / length) * POINTER_TILT }
    }
    const onPointerMove = (event: PointerEvent) => {
      if (event.buttons) steerByPointer(event)
    }
    const release = () => {
      if (!hasSensor) sensed = { x: 0, y: 0 }
      void requestMotionPermission()
    }

    canvas.addEventListener('pointerdown', steerByPointer)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', release)
    canvas.addEventListener('pointercancel', release)
    frame = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(frame)
      unsubscribe()
      canvas.removeEventListener('pointerdown', steerByPointer)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', release)
      canvas.removeEventListener('pointercancel', release)
    }
  }, [canvasRef])

  return <canvas ref={canvasRef} className="marble-maze" />
}
