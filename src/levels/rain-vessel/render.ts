import type { SurfacePoint } from './liquid'
import { BORDER_WIDTH, dropRadius, TRAIL_MS, type RainSimulation, type TrailPoint } from './simulation'

const TRAIL_SHADE = 34
const TRAIL_ALPHA_STEPS = 12
const WAVE_SEGMENTS = 32
const WAVE_LENGTH = 240
const WAVE_LENGTH_SECONDARY = 150
const WAVE_PERIOD_MS = 450
const SPAWN_GROW_MS = 100
const SPLATTER_SHADE = 70
const SPLATTER_FLIGHT_MS = 90

function drawTrail(ctx: CanvasRenderingContext2D, trail: TrailPoint[], now: number) {
  let bucket = -1
  for (let i = 1; i < trail.length; i++) {
    const alpha = 1 - (now - trail[i].t) / TRAIL_MS
    if (alpha <= 0) continue
    const next = Math.ceil(alpha * TRAIL_ALPHA_STEPS)
    if (next !== bucket) {
      if (bucket !== -1) ctx.stroke()
      bucket = next
      ctx.strokeStyle = `rgb(${TRAIL_SHADE} ${TRAIL_SHADE} ${TRAIL_SHADE} / ${bucket / TRAIL_ALPHA_STEPS})`
      ctx.lineWidth = trail[i].width
      ctx.beginPath()
      ctx.moveTo(trail[i - 1].x, trail[i - 1].y)
    }
    ctx.lineTo(trail[i].x, trail[i].y)
  }
  if (bucket !== -1) ctx.stroke()
}

function drawLiquid(ctx: CanvasRenderingContext2D, sim: RainSimulation, now: number) {
  const { polygon, nx, ny } = sim.liquid
  if (polygon.length < 3) return

  const traceSurface = (from: SurfacePoint, to: SurfacePoint) => {
    const length = Math.hypot(to.x - from.x, to.y - from.y)
    for (let k = 1; k <= WAVE_SEGMENTS; k++) {
      const u = k / WAVE_SEGMENTS
      const along = u * length
      const shape =
        Math.sin((along / WAVE_LENGTH) * Math.PI * 2 + now / WAVE_PERIOD_MS) * 0.7 +
        Math.sin((along / WAVE_LENGTH_SECONDARY) * Math.PI * 2 - now / (WAVE_PERIOD_MS * 1.3)) * 0.3
      const wave = sim.waveAmplitude * shape * Math.sin(Math.PI * u)
      ctx.lineTo(from.x + (to.x - from.x) * u - nx * wave, from.y + (to.y - from.y) * u - ny * wave)
    }
  }

  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.moveTo(polygon[0].x, polygon[0].y)
  polygon.forEach((point, i) => {
    const next = polygon[(i + 1) % polygon.length]
    if (point.onSurface && next.onSurface) traceSurface(point, next)
    else ctx.lineTo(next.x, next.y)
  })
  ctx.closePath()
  ctx.fill()
}

function drawDrops(ctx: CanvasRenderingContext2D, sim: RainSimulation, now: number) {
  ctx.fillStyle = '#fff'
  sim.drops.forEach((drop) => {
    const grow = Math.min(1, (now - drop.born) / SPAWN_GROW_MS)
    const r = dropRadius(drop) * grow
    const speed = Math.hypot(drop.vx, drop.vy)
    const stretch = 1 + Math.min(0.5, speed / 400)
    ctx.beginPath()
    ctx.ellipse(drop.x, drop.y, r * stretch, r / Math.sqrt(stretch), Math.atan2(drop.vy, drop.vx), 0, Math.PI * 2)
    ctx.fill()
  })
}

function drawSplatters(ctx: CanvasRenderingContext2D, sim: RainSimulation, now: number) {
  sim.splatters.forEach((splatter) => {
    const age = now - splatter.born
    const flight = 1 - (1 - Math.min(1, age / SPLATTER_FLIGHT_MS)) ** 3
    const alpha = Math.min(1, 2 * (1 - age / splatter.life))
    if (alpha <= 0) return
    ctx.fillStyle = `rgb(${SPLATTER_SHADE} ${SPLATTER_SHADE} ${SPLATTER_SHADE} / ${alpha})`
    ctx.beginPath()
    ctx.arc(
      splatter.fromX + (splatter.x - splatter.fromX) * flight,
      splatter.fromY + (splatter.y - splatter.fromY) * flight,
      splatter.r,
      0,
      Math.PI * 2,
    )
    ctx.fill()
  })
}

function drawParticles(ctx: CanvasRenderingContext2D, sim: RainSimulation, now: number) {
  sim.particles.forEach((particle) => {
    const alpha = 1 - (now - particle.born) / particle.life
    if (alpha <= 0) return
    ctx.fillStyle = `rgb(255 255 255 / ${alpha})`
    ctx.beginPath()
    ctx.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2)
    ctx.fill()
  })
}

function drawBorder(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const inset = BORDER_WIDTH / 2
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = BORDER_WIDTH
  ctx.lineJoin = 'miter'
  ctx.lineCap = 'butt'
  ctx.beginPath()
  ctx.moveTo(inset, height)
  ctx.lineTo(inset, inset)
  ctx.lineTo(width - inset, inset)
  ctx.lineTo(width - inset, height)
  ctx.stroke()
}

export function renderRain(ctx: CanvasRenderingContext2D, sim: RainSimulation, now: number) {
  const { width, height } = sim
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, width, height)

  ctx.lineCap = 'butt'
  ctx.lineJoin = 'round'
  sim.deadTrails.forEach((trail) => drawTrail(ctx, trail, now))
  sim.drops.forEach((drop) => drawTrail(ctx, drop.trail, now))

  drawSplatters(ctx, sim, now)
  drawLiquid(ctx, sim, now)
  drawDrops(ctx, sim, now)
  drawParticles(ctx, sim, now)
  drawBorder(ctx, width, height)
}
