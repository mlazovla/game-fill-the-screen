import { BALL_RADIUS, COLLIDERS, WALL, type Vec } from './maze'

export interface Ball {
  position: Vec
  velocity: Vec
}

const TILT_ACCEL = 60
const DRAG = 0.3
const ROLLING_RESISTANCE = 1
const RESTITUTION = 0.35
const MAX_SPEED = 40
const MAX_MOVE = 0.25
const REACH = BALL_RADIUS + WALL / 2

function collide(ball: Ball) {
  let impact = 0
  const p = ball.position
  for (const { a, b } of COLLIDERS) {
    const abx = b.x - a.x
    const aby = b.y - a.y
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby) / (abx * abx + aby * aby)))
    const dx = p.x - (a.x + abx * t)
    const dy = p.y - (a.y + aby * t)
    const distance = Math.hypot(dx, dy)
    if (distance >= REACH || distance === 0) continue
    const nx = dx / distance
    const ny = dy / distance
    p.x += nx * (REACH - distance)
    p.y += ny * (REACH - distance)
    const along = ball.velocity.x * nx + ball.velocity.y * ny
    if (along < 0) {
      ball.velocity.x -= (1 + RESTITUTION) * along * nx
      ball.velocity.y -= (1 + RESTITUTION) * along * ny
      impact = Math.max(impact, -along)
    }
  }
  return impact
}

export function stepBall(ball: Ball, tilt: Vec, dt: number) {
  const v = ball.velocity
  v.x += tilt.x * TILT_ACCEL * dt
  v.y += tilt.y * TILT_ACCEL * dt
  const damping = Math.exp(-DRAG * dt)
  v.x *= damping
  v.y *= damping
  let speed = Math.hypot(v.x, v.y)
  if (speed > 0) {
    const slowed = Math.max(0, Math.min(speed, MAX_SPEED) - ROLLING_RESISTANCE * dt)
    v.x *= slowed / speed
    v.y *= slowed / speed
    speed = slowed
  }

  const steps = Math.max(1, Math.ceil((speed * dt) / MAX_MOVE))
  let impact = 0
  for (let i = 0; i < steps; i++) {
    ball.position.x += (v.x * dt) / steps
    ball.position.y += (v.y * dt) / steps
    impact = Math.max(impact, collide(ball))
  }
  return impact
}
