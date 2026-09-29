export const COLUMN_PX = 2
const GRAVITY = 2200
const START_SPEED = 150
const MIN_RADIUS = 0.1
const MAX_RADIUS = 0.24
const RADIUS_JITTER = 0.2
const CONTROL_POINTS = 8
const SMOOTH_STEPS = 4
const SPAWN_BINS = 24
const MUD_DRAG = 8
const MUD_MIN_SPEED = 90
const SOLID_THICKNESS = 1

interface Point {
  x: number
  y: number
}

interface Stone {
  x: number
  y: number
  vy: number
  angle: number
  spin: number
  radius: number
  outline: Point[]
}

interface Embedding {
  touching: boolean
  buried: boolean
}

interface Profile {
  first: number
  top: number[]
  bottom: number[]
}

const random = (min: number, max: number) => min + Math.random() * (max - min)

function stoneOutline(radius: number): Point[] {
  const control = Array.from({ length: CONTROL_POINTS }, (_, i) => {
    const angle = ((i + random(-0.3, 0.3)) / CONTROL_POINTS) * Math.PI * 2
    const r = radius * random(0.75, 1)
    return { x: Math.cos(angle) * r, y: Math.sin(angle) * r }
  })
  const outline: Point[] = []
  control.forEach((corner, i) => {
    const prev = control[(i + CONTROL_POINTS - 1) % CONTROL_POINTS]
    const next = control[(i + 1) % CONTROL_POINTS]
    const start = { x: (prev.x + corner.x) / 2, y: (prev.y + corner.y) / 2 }
    const end = { x: (corner.x + next.x) / 2, y: (corner.y + next.y) / 2 }
    for (let step = 0; step < SMOOTH_STEPS; step++) {
      const t = step / SMOOTH_STEPS
      const u = 1 - t
      outline.push({
        x: u * u * start.x + 2 * u * t * corner.x + t * t * end.x,
        y: u * u * start.y + 2 * u * t * corner.y + t * t * end.y,
      })
    }
  })
  return outline
}

export class StoneHeap {
  width = 0
  height = 0
  surface = new Float32Array(0)
  falling: Stone[] = []
  settled = 0
  private pending = 0
  private pendingSize = 0

  resize(width: number, height: number) {
    const columns = Math.max(1, Math.ceil(width / COLUMN_PX))
    if (width === this.width && height === this.height) return
    const previous = this.surface
    const scale = this.height > 0 ? height / this.height : 1
    this.surface = new Float32Array(columns)
    for (let c = 0; c < columns; c++) {
      const source = previous.length ? previous[Math.floor((c / columns) * previous.length)] * scale : height
      this.surface[c] = source
    }
    this.width = width
    this.height = height
  }

  get complete() {
    return this.width > 0 && this.surface.every((y) => y <= 0)
  }

  get fill() {
    if (!this.height) return 0
    let covered = 0
    for (const y of this.surface) covered += this.height - Math.max(0, y)
    return covered / (this.surface.length * this.height)
  }

  drop(count: number, size: number) {
    this.pending += count
    this.pendingSize = Math.min(1, Math.max(0, size))
  }

  step(dt: number) {
    for (; this.pending >= 1 && !this.complete; this.pending--) this.spawn()
    this.falling = this.falling.filter((stone) => this.move(stone, dt))
  }

  outlineOf(stone: Stone): Point[] {
    const cos = Math.cos(stone.angle)
    const sin = Math.sin(stone.angle)
    return stone.outline.map((p) => ({ x: stone.x + p.x * cos - p.y * sin, y: stone.y + p.x * sin + p.y * cos }))
  }

  private spawn() {
    const weights = Array.from({ length: SPAWN_BINS }, (_, bin) => {
      const from = Math.floor((bin / SPAWN_BINS) * this.surface.length)
      const to = Math.floor(((bin + 1) / SPAWN_BINS) * this.surface.length)
      let depth = 0
      for (let c = from; c < to; c++) depth = Math.max(depth, this.surface[c])
      return depth * depth
    })
    const total = weights.reduce((sum, w) => sum + w, 0)
    let pick = Math.random() * total
    let bin = 0
    while (bin < SPAWN_BINS - 1 && pick > weights[bin]) pick -= weights[bin++]

    const base = MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * this.pendingSize
    const radius = this.width * base * random(1 - RADIUS_JITTER, 1 + RADIUS_JITTER)
    this.falling.push({
      x: ((bin + Math.random()) / SPAWN_BINS) * this.width,
      y: -radius,
      vy: START_SPEED,
      angle: random(0, Math.PI * 2),
      spin: random(-3, 3),
      radius,
      outline: stoneOutline(radius),
    })
  }

  private profile(points: Point[]): Profile | null {
    const xs = points.map((p) => p.x)
    const first = Math.max(0, Math.ceil(Math.min(...xs) / COLUMN_PX))
    const last = Math.min(this.surface.length - 1, Math.floor(Math.max(...xs) / COLUMN_PX))
    if (last < first) return null
    const top: number[] = []
    const bottom: number[] = []
    for (let c = first; c <= last; c++) {
      const x = c * COLUMN_PX
      let min = Infinity
      let max = -Infinity
      points.forEach((a, i) => {
        const b = points[(i + 1) % points.length]
        if ((a.x <= x) === (b.x <= x)) return
        const y = a.y + ((x - a.x) / (b.x - a.x)) * (b.y - a.y)
        min = Math.min(min, y)
        max = Math.max(max, y)
      })
      top.push(min)
      bottom.push(max)
    }
    return { first, top, bottom }
  }

  private embedding(stone: Stone): Embedding | null {
    const profile = this.profile(this.outlineOf(stone))
    if (!profile) return null
    const solid = stone.radius * SOLID_THICKNESS
    let touching = false
    let buried = true
    profile.bottom.forEach((bottom, i) => {
      const top = profile.top[i]
      if (!Number.isFinite(bottom) || !Number.isFinite(top)) return
      const surface = this.surface[profile.first + i]
      if (bottom > surface) touching = true
      else if (bottom - top >= solid) buried = false
    })
    return { touching, buried }
  }

  private move(stone: Stone, dt: number) {
    const before = this.embedding(stone)
    if (before?.touching) {
      const drag = Math.exp(-MUD_DRAG * dt)
      stone.vy = Math.max(MUD_MIN_SPEED, stone.vy * drag)
      stone.spin *= drag
    } else {
      stone.vy += GRAVITY * dt
    }
    stone.y += stone.vy * dt
    stone.angle += stone.spin * dt

    const after = this.embedding(stone)
    if (!after) return stone.y < this.height + stone.radius
    if (!after.touching || !after.buried) return true
    this.settle(stone)
    return false
  }

  private settle(stone: Stone) {
    this.settled++
    const profile = this.profile(this.outlineOf(stone))
    profile?.top.forEach((y, i) => {
      if (!Number.isFinite(y)) return
      const c = profile.first + i
      this.surface[c] = Math.max(0, Math.min(this.surface[c], y))
    })
  }
}
