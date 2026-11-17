import { useEffect, useEffectEvent } from 'react'
import type { LevelProps } from '../../game/types'
import { useFullscreenCanvas } from '../../game/useFullscreenCanvas'
import { vibrate } from '../../platform/haptics'
import {
  BEAD_RADIUS,
  containsPoint,
  createLayout,
  isOffScreen,
  isOnShade,
  litFraction,
  pushOffBulb,
  SHADE_BOTTOM_HALF,
  shadeCorners,
  tableRestDy,
  type Layout,
  type Point,
  type Pose,
} from './lamp'
import { renderLamp } from './render'
import './LampLevel.css'

const MAX_STEP_S = 0.05
const MAX_PULL = 0.8
const CLICK_PULL = 0.4
const CORD_SPRING = 22
const CORD_HIT_PX = 24
const SHADE_MARGIN = 0.3
const GRAVITY = 50
const SPIN_PER_SPEED = 0.25
const MAX_SPIN = 8
const VELOCITY_WINDOW_MS = 100
const SNAP_BACK_DISTANCE = 0.6
const SNAP_BACK_SPEED = 4
const BULB_CLEARANCE = 0.05
const MAX_SUBSTEP = 0.2
const BASE_CLEARANCE = SHADE_BOTTOM_HALF + 1.3
const SETTLE_EASE = 18
const FADE_S = 0.6
const CLICK_HAPTIC_MS = 15
const LAND_HAPTIC_MS = 10
const FILL_COLUMNS = 24
const FILL_ROWS = 40

type ShadeMode = 'still' | 'drag' | 'fly' | 'settle'

interface Sample {
  time: number
  dx: number
  dy: number
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export default function LampLevel({ onProgress, onComplete }: LevelProps) {
  const canvasRef = useFullscreenCanvas('#000')

  const reportFill = useEffectEvent((ratio: number) => onProgress(ratio))
  const complete = useEffectEvent(() => onComplete())

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    let layout: Layout = createLayout(canvas.clientWidth, canvas.clientHeight)
    const pose: Pose = { dx: 0, dy: 0, angle: 0 }
    const velocity = { x: 0, y: 0 }
    let spin = 0
    let mode: ShadeMode = 'still'
    let target = { dx: 0, dy: 0 }
    let shadePointer: number | null = null
    let grab = { x: 0, y: 0 }
    let samples: Sample[] = []
    let lit = false
    let pull = 0
    let cordPointer: number | null = null
    let cordGrabY = 0
    let clicked = false
    let finishing = false
    let fade = 0
    let completed = false
    let reportedPercent = -1
    let last = performance.now()
    let frame = 0

    const toPoint = (event: PointerEvent): Point => {
      const rect = canvas.getBoundingClientRect()
      return { x: event.clientX - rect.left, y: event.clientY - rect.top }
    }

    const isOnCord = (point: Point) => {
      const { unit, cordX, beadRest, shadeRest } = layout
      const reach = Math.max(CORD_HIT_PX, 0.6 * unit)
      const top = shadeRest.y + 1.75 * unit
      const bottom = beadRest + pull * unit + BEAD_RADIUS * unit + reach
      return Math.abs(point.x - cordX) <= reach && point.y >= top && point.y <= bottom
    }

    const onPointerDown = (event: PointerEvent) => {
      if (finishing) return
      const point = toPoint(event)
      if (shadePointer === null && isOnShade(layout, pose, point, SHADE_MARGIN)) {
        canvas.setPointerCapture(event.pointerId)
        shadePointer = event.pointerId
        mode = 'drag'
        spin = 0
        grab = {
          x: (point.x - layout.shadeRest.x) / layout.unit - pose.dx,
          y: (point.y - layout.shadeRest.y) / layout.unit - pose.dy,
        }
        samples = [{ time: event.timeStamp, dx: pose.dx, dy: pose.dy }]
      } else if (cordPointer === null && isOnCord(point)) {
        canvas.setPointerCapture(event.pointerId)
        cordPointer = event.pointerId
        cordGrabY = point.y - pull * layout.unit
        clicked = false
      }
    }

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerId === shadePointer) {
        const point = toPoint(event)
        const tableDy = tableRestDy(layout)
        const targetDx = (point.x - layout.shadeRest.x) / layout.unit - grab.x
        const targetDy = Math.min(tableDy, (point.y - layout.shadeRest.y) / layout.unit - grab.y)
        moveShade(targetDx - pose.dx, targetDy - pose.dy)
        pose.dy = Math.min(tableDy, pose.dy)
        samples.push({ time: event.timeStamp, dx: pose.dx, dy: pose.dy })
        samples = samples.filter((sample) => event.timeStamp - sample.time <= VELOCITY_WINDOW_MS)
      } else if (event.pointerId === cordPointer) {
        pull = clamp((toPoint(event).y - cordGrabY) / layout.unit, 0, MAX_PULL)
        if (pull >= CLICK_PULL && !clicked) {
          clicked = true
          lit = true
          vibrate(CLICK_HAPTIC_MS)
        }
      }
    }

    const onPointerEnd = (event: PointerEvent) => {
      if (event.pointerId === shadePointer) {
        shadePointer = null
        const recent = samples.filter((sample) => event.timeStamp - sample.time <= VELOCITY_WINDOW_MS)
        const first = recent[0]
        const span = first ? (event.timeStamp - first.time) / 1000 : 0
        velocity.x = span > 0 ? (pose.dx - first.dx) / span : 0
        velocity.y = span > 0 ? (pose.dy - first.dy) / span : 0
        const speed = Math.hypot(velocity.x, velocity.y)
        if (Math.hypot(pose.dx, pose.dy) < SNAP_BACK_DISTANCE && speed < SNAP_BACK_SPEED) {
          settle(0, 0)
        } else {
          mode = 'fly'
          spin = clamp(velocity.x * SPIN_PER_SPEED, -MAX_SPIN, MAX_SPIN)
        }
      } else if (event.pointerId === cordPointer) {
        cordPointer = null
      }
    }

    const moveShade = (dx: number, dy: number) => {
      const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / MAX_SUBSTEP))
      let contact: Point | null = null
      for (let i = 0; i < steps; i++) {
        pose.dx += dx / steps
        pose.dy += dy / steps
        contact = pushOffBulb(layout, pose, BULB_CLEARANCE) ?? contact
      }
      return contact
    }

    const settle = (dx: number, dy: number) => {
      target = { dx, dy }
      pose.angle = Math.atan2(Math.sin(pose.angle), Math.cos(pose.angle))
      mode = 'settle'
    }

    const updateShade = (dt: number) => {
      if (mode === 'fly') {
        const tableDy = tableRestDy(layout)
        velocity.y += GRAVITY * dt
        pose.angle += spin * dt
        const turned = pushOffBulb(layout, pose, BULB_CLEARANCE)
        const contact = moveShade(velocity.x * dt, velocity.y * dt) ?? turned
        if (contact) {
          spin = 0
          const length = Math.hypot(contact.x, contact.y)
          const into = (velocity.x * contact.x + velocity.y * contact.y) / length
          if (into < 0) {
            velocity.x -= (into * contact.x) / length
            velocity.y -= (into * contact.y) / length
          }
        }
        if (velocity.y > 0 && pose.dy >= 0 && containsPoint(shadeCorners(layout, pose), layout.bulb)) {
          settle(0, 0)
          vibrate(LAND_HAPTIC_MS)
        } else if (velocity.y > 0 && pose.dy >= tableDy) {
          pose.dy = tableDy
          settle(Math.sign(pose.dx || 1) * Math.max(Math.abs(pose.dx), BASE_CLEARANCE), tableDy)
          vibrate(LAND_HAPTIC_MS)
        }
      } else if (mode === 'settle') {
        const ease = 1 - Math.exp(-SETTLE_EASE * dt)
        moveShade((target.dx - pose.dx) * ease, (target.dy - pose.dy) * ease)
        pose.angle -= pose.angle * ease
        pushOffBulb(layout, pose, BULB_CLEARANCE)
        if (Math.hypot(target.dx - pose.dx, target.dy - pose.dy) < 0.005 && Math.abs(pose.angle) < 0.002) {
          pose.dx = target.dx
          pose.dy = target.dy
          pose.angle = 0
          mode = 'still'
        }
      }
    }

    const loop = (now: number) => {
      const dt = Math.min(MAX_STEP_S, Math.max(0, (now - last) / 1000))
      last = now
      if (layout.width !== canvas.clientWidth || layout.height !== canvas.clientHeight) {
        layout = createLayout(canvas.clientWidth, canvas.clientHeight)
      }

      if (cordPointer === null) pull -= pull * (1 - Math.exp(-CORD_SPRING * dt))
      updateShade(dt)
      const corners = shadeCorners(layout, pose)

      if (lit && !finishing && isOffScreen(layout, corners)) finishing = true
      if (finishing) fade = Math.min(1, fade + dt / FADE_S)

      renderLamp(ctx, layout, { lit, corners, pull, fade })

      const fill = lit ? litFraction(layout, corners, FILL_COLUMNS, FILL_ROWS) : 0
      const percent = Math.floor((fill + (1 - fill) * fade) * 100)
      if (percent !== reportedPercent) {
        reportedPercent = percent
        reportFill(percent / 100)
      }
      if (fade >= 1 && !completed) {
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

  return <canvas ref={canvasRef} className="lamp" />
}
