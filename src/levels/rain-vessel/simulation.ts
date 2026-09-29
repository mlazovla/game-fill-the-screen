import type { Gravity } from '../../platform/deviceGravity'
import { shapeForArea, submergedOpening, type LiquidShape } from './liquid'

export const BORDER_WIDTH = 6

const DROP_RADIUS = 9.6
const DROP_SIZE_VARIATION = 0.1
const MERGE_REACH = 1.2
const SPAWN_EVENTS_PER_S = 2.5
const DOUBLE_SPAWN_CHANCE = 0.2
const RAIN_MAX_FACE_DOWN = Math.sin((15 * Math.PI) / 180)
const DROP_SPEED = 140
const DROP_ACCELERATION = 6
const STICK_THRESHOLD = 0.12
const WOBBLE = 0.1
const WALL_ABSORB_GRAVITY = 0.25
export const TRAIL_MS = 2500
const TRAIL_STEP = 4
const DROPS_TO_FILL = 100
const COMPLETE_FILL = 0.97
const FLOOD_S = 0.7
const LEVEL_RESPONSE = 4
const LEVEL_FULL = 0.995
const DRAIN_SPEED = 400
const SLOSH_STIFFNESS = 8
const SLOSH_DAMPING = 4.5
const WAVE_DECAY = 1.5
const WAVE_FROM_SLOSH = 8
const WAVE_MAX = 12
const SPLASH_PARTICLES = 5
const PARTICLE_GRAVITY = 900
const OUTFLOW_PER_PX_S = 0.4
const SPLATTER_MIN = 4
const SPLATTER_MAX = 7

export interface TrailPoint {
  x: number
  y: number
  t: number
  width: number
}

export interface Drop {
  x: number
  y: number
  vx: number
  vy: number
  mass: number
  count: number
  born: number
  wobble: number
  trail: TrailPoint[]
}

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  born: number
  life: number
  r: number
}

export interface Splatter {
  fromX: number
  fromY: number
  x: number
  y: number
  born: number
  life: number
  r: number
}

export const dropRadius = (drop: Drop) => DROP_RADIUS * Math.sqrt(drop.mass)

const wrapAngle = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle))
const randomBetween = (min: number, max: number) => min + Math.random() * (max - min)
const nextSpawnDelay = () => -Math.log(1 - Math.random()) / SPAWN_EVENTS_PER_S

export interface RainListener {
  onDropLanded?: (relativeX: number) => void
}

export class RainSimulation {
  width = 0
  height = 0
  fill = 0
  displayedFill = 0
  drops: Drop[] = []
  deadTrails: TrailPoint[][] = []
  particles: Particle[] = []
  splatters: Splatter[] = []
  liquid: LiquidShape = { nx: 0, ny: 1, offset: Infinity, polygon: [] }
  waveAmplitude = 0
  completed = false

  private surfaceAngle = Math.PI / 2
  private angularVelocity = 0
  private displayedFillVelocity = 0
  private flooding = false
  private spawnIn = nextSpawnDelay()

  private readonly listener: RainListener

  constructor(listener: RainListener = {}) {
    this.listener = listener
  }

  step(dt: number, now: number, gravity: Gravity, width: number, height: number) {
    this.width = width
    this.height = height
    const planar = Math.hypot(gravity.x, gravity.y)

    this.slosh(dt, gravity, planar)
    this.updateFill(dt, now, gravity)
    this.followFill(dt)
    this.liquid = shapeForArea(width, height, this.surfaceAngle, this.displayedFill * width * height)

    if (gravity.z < RAIN_MAX_FACE_DOWN && !this.flooding) this.rain(dt, now)
    this.moveDrops(dt, now, gravity, planar)
    this.mergeDrops()
    this.moveParticles(dt, now, gravity)
    this.splatters = this.splatters.filter((splatter) => now - splatter.born < splatter.life)
    this.pruneTrails(now)
  }

  private slosh(dt: number, gravity: Gravity, planar: number) {
    const target = Math.atan2(gravity.y, gravity.x)
    const spring = planar > 0.05 ? SLOSH_STIFFNESS * planar * wrapAngle(target - this.surfaceAngle) : 0
    this.angularVelocity += (spring - SLOSH_DAMPING * this.angularVelocity) * dt
    this.surfaceAngle = wrapAngle(this.surfaceAngle + this.angularVelocity * dt)
    this.waveAmplitude = Math.max(
      this.waveAmplitude * Math.exp(-WAVE_DECAY * dt),
      Math.min(WAVE_MAX, Math.abs(this.angularVelocity) * WAVE_FROM_SLOSH),
    )
  }

  private followFill(dt: number) {
    const pull = LEVEL_RESPONSE ** 2 * (this.fill - this.displayedFill)
    this.displayedFillVelocity += (pull - 2 * LEVEL_RESPONSE * this.displayedFillVelocity) * dt
    this.displayedFill += this.displayedFillVelocity * dt
    if (this.displayedFill <= 0 || this.displayedFill >= 1) {
      this.displayedFill = Math.min(1, Math.max(0, this.displayedFill))
      this.displayedFillVelocity = 0
    }
    if (this.flooding && this.fill >= 1 && this.displayedFill >= LEVEL_FULL) {
      this.displayedFill = 1
      this.completed = true
    }
  }

  private updateFill(dt: number, now: number, gravity: Gravity) {
    if (this.flooding) {
      this.fill = Math.min(1, this.fill + dt / FLOOD_S)
      return
    }

    const area = this.width * this.height
    const physical = shapeForArea(this.width, this.height, this.surfaceAngle, this.fill * area)
    const opening = submergedOpening(physical, this.width, this.height)
    if (!opening) return
    const [from, to] = opening
    this.fill = Math.max(0, this.fill - (DRAIN_SPEED * (to - from) * dt) / area)

    const expected = (to - from) * OUTFLOW_PER_PX_S * dt
    const count = Math.floor(expected) + (Math.random() < expected % 1 ? 1 : 0)
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: randomBetween(from, to),
        y: this.height - 2,
        vx: gravity.x * 200 + randomBetween(-30, 30),
        vy: Math.max(60, gravity.y * 200) + randomBetween(0, 80),
        born: now,
        life: 400,
        r: randomBetween(1.5, 3),
      })
    }
  }

  private rain(dt: number, now: number) {
    this.spawnIn -= dt
    while (this.spawnIn <= 0) {
      const count = Math.random() < DOUBLE_SPAWN_CHANCE ? 2 : 1
      for (let i = 0; i < count; i++) this.spawnDrop(now)
      this.spawnIn += nextSpawnDelay()
    }
  }

  private spawnDrop(now: number) {
    const margin = DROP_RADIUS + BORDER_WIDTH
    const x = randomBetween(margin, this.width - margin)
    const y = randomBetween(margin, this.height - DROP_RADIUS)
    this.listener.onDropLanded?.(x / this.width)
    this.splash(x, y, now)
    this.drops.push({
      x,
      y,
      vx: 0,
      vy: 0,
      mass: randomBetween(1 - DROP_SIZE_VARIATION, 1 + DROP_SIZE_VARIATION) ** 2,
      count: 1,
      born: now,
      wobble: Math.random() * Math.PI * 2,
      trail: [],
    })
  }

  private splash(x: number, y: number, now: number) {
    const count = Math.round(randomBetween(SPLATTER_MIN, SPLATTER_MAX))
    for (let i = 0; i < count; i++) {
      const angle = randomBetween(0, Math.PI * 2)
      const distance = DROP_RADIUS * randomBetween(1.4, 3.2)
      this.splatters.push({
        fromX: x,
        fromY: y,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        born: now,
        life: randomBetween(500, 900),
        r: randomBetween(1, 2.8),
      })
    }
  }

  private moveDrops(dt: number, now: number, gravity: Gravity, planar: number) {
    const { nx, ny, offset } = this.liquid
    const blend = Math.min(1, dt * DROP_ACCELERATION)

    this.drops = this.drops.filter((drop) => {
      const r = dropRadius(drop)
      let targetX = 0
      let targetY = 0
      if (planar * Math.sqrt(drop.mass) > STICK_THRESHOLD) {
        const speed = DROP_SPEED * planar * drop.mass ** 0.35
        const dirX = gravity.x / planar
        const dirY = gravity.y / planar
        const t = now / 1000 + drop.wobble
        const wobble = (Math.sin(t * 2.3) + Math.sin(t * 5.1 + drop.wobble) * 0.6) * WOBBLE
        targetX = (dirX - dirY * wobble) * speed
        targetY = (dirY + dirX * wobble) * speed
      }
      drop.vx += (targetX - drop.vx) * blend
      drop.vy += (targetY - drop.vy) * blend
      drop.x += drop.vx * dt
      drop.y += drop.vy * dt

      const last = drop.trail.at(-1)
      if (!last || Math.hypot(drop.x - last.x, drop.y - last.y) >= TRAIL_STEP) {
        drop.trail.push({ x: drop.x, y: drop.y, t: now, width: r * 0.9 })
      }

      const reach = r + BORDER_WIDTH
      if (drop.x < reach) {
        if (gravity.x < -WALL_ABSORB_GRAVITY) return this.absorb(drop, now)
        drop.x = reach
        drop.vx = Math.max(0, drop.vx)
      }
      if (drop.x > this.width - reach) {
        if (gravity.x > WALL_ABSORB_GRAVITY) return this.absorb(drop, now)
        drop.x = this.width - reach
        drop.vx = Math.min(0, drop.vx)
      }
      if (drop.y < reach) {
        if (gravity.y < -WALL_ABSORB_GRAVITY) return this.absorb(drop, now)
        drop.y = reach
        drop.vy = Math.max(0, drop.vy)
      }
      if (drop.y - r > this.height) return this.release(drop)
      if (nx * drop.x + ny * drop.y >= offset - r) return this.absorb(drop, now)
      return true
    })
  }

  private mergeDrops() {
    for (let i = 0; i < this.drops.length; i++) {
      for (let j = i + 1; j < this.drops.length; j++) {
        const a = this.drops[i]
        const b = this.drops[j]
        if (Math.hypot(a.x - b.x, a.y - b.y) >= (dropRadius(a) + dropRadius(b)) * MERGE_REACH) continue
        const [big, small] = a.mass >= b.mass ? [a, b] : [b, a]
        const mass = big.mass + small.mass
        big.x = (big.x * big.mass + small.x * small.mass) / mass
        big.y = (big.y * big.mass + small.y * small.mass) / mass
        big.vx = (big.vx * big.mass + small.vx * small.mass) / mass
        big.vy = (big.vy * big.mass + small.vy * small.mass) / mass
        big.mass = mass
        big.count += small.count
        big.born = Math.min(big.born, small.born)
        this.deadTrails.push(small.trail)
        this.drops[i] = big
        this.drops.splice(j, 1)
        j = i
      }
    }
  }

  private absorb(drop: Drop, now: number) {
    this.fill = Math.min(1, this.fill + drop.count / DROPS_TO_FILL)
    if (this.fill >= COMPLETE_FILL) this.flooding = true
    this.waveAmplitude = Math.min(WAVE_MAX, this.waveAmplitude + 3 * Math.sqrt(drop.mass))
    for (let i = 0; i < SPLASH_PARTICLES; i++) {
      const angle = Math.atan2(-this.liquid.ny, -this.liquid.nx) + randomBetween(-1, 1)
      const speed = randomBetween(80, 220)
      this.particles.push({
        x: drop.x,
        y: drop.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        born: now,
        life: randomBetween(250, 450),
        r: randomBetween(1.5, 2.5),
      })
    }
    return this.release(drop)
  }

  private release(drop: Drop) {
    this.deadTrails.push(drop.trail)
    return false
  }

  private moveParticles(dt: number, now: number, gravity: Gravity) {
    this.particles = this.particles.filter((particle) => {
      particle.vx += gravity.x * PARTICLE_GRAVITY * dt
      particle.vy += gravity.y * PARTICLE_GRAVITY * dt
      particle.x += particle.vx * dt
      particle.y += particle.vy * dt
      return now - particle.born < particle.life
    })
  }

  private pruneTrails(now: number) {
    const fresh = (point: TrailPoint) => now - point.t < TRAIL_MS
    this.drops.forEach((drop) => {
      const firstFresh = drop.trail.findIndex(fresh)
      const keepFrom = firstFresh === -1 ? drop.trail.length - 1 : firstFresh - 1
      if (keepFrom > 0) drop.trail.splice(0, keepFrom)
    })
    this.deadTrails = this.deadTrails
      .map((trail) => trail.filter(fresh))
      .filter((trail) => trail.length > 1)
  }
}

