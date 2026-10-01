const REFERENCE_WIDTH = 390
const SEED = 6
const UPPER_EMBERS = [0.18, 0.82, 0.5]
const MIDDLE_EMBERS = [0.12, 0.88]
const LOWER_EMBERS = [0.33, 0.7]
const CONTROL_POINTS = 7
const SMOOTH_STEPS = 4
const FISSURES = 2
const CRACKLE_CELL = 0.14
const CRACKLE_DENSITY = 0.75
const STICK_BASES = [0.1, 0.26, 0.42, 0.58, 0.74, 0.9]
const FRONT_STICK = 2
const DEEP_STICK = 3
const SPOTS_PER_STICK = 5

export interface Point {
  x: number
  y: number
}

export interface Ember {
  dark: boolean
  center: Point
  radiusY: number
  outline: Point[]
  edgeWidths: number[]
  fissures: Point[][]
  fissureWidths: number[]
  crackle: Point[][]
}

export interface Spot {
  along: number
  across: number
  radius: number
  threshold: number
}

export interface Stick {
  from: Point
  to: Point
  thickness: number
  front: boolean
  spots: Spot[]
}

export interface Scene {
  width: number
  height: number
  scale: number
  embers: Ember[]
  sticks: Stick[]
  flameBase: Point
}

type Random = () => number

function seededRandom(seed: number): Random {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function smoothOutline(control: Point[]): Point[] {
  const outline: Point[] = []
  control.forEach((corner, i) => {
    const prev = control[(i + control.length - 1) % control.length]
    const next = control[(i + 1) % control.length]
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

function varyingWidths(rand: Random, count: number) {
  const raw = Array.from({ length: count }, () => 0.2 + rand() * 1.6)
  return raw.map((_, i) => (raw[(i + count - 1) % count] + raw[i] * 2 + raw[(i + 1) % count]) / 4)
}

function wobbly(rand: Random, from: Point, to: Point, amount: number): Point[] {
  const mid = { x: (from.x + to.x) / 2 + (rand() - 0.5) * amount, y: (from.y + to.y) / 2 + (rand() - 0.5) * amount }
  return [from, mid, to]
}

function createCrackle(rand: Random, center: Point, radiusX: number, radiusY: number): Point[][] {
  const cell = radiusY * 2 * CRACKLE_CELL
  const columns = Math.ceil((radiusX * 2) / cell) + 1
  const rows = Math.ceil((radiusY * 2) / cell) + 1
  const grid = Array.from({ length: columns }, (_, i) =>
    Array.from({ length: rows }, (_, j) => ({
      x: center.x - radiusX + (i + (rand() - 0.5) * 0.7) * cell,
      y: center.y - radiusY + (j + (rand() - 0.5) * 0.7) * cell,
    })),
  )
  const lines: Point[][] = []
  for (let i = 0; i < columns; i++) {
    for (let j = 0; j < rows; j++) {
      if (i + 1 < columns && rand() < CRACKLE_DENSITY) lines.push(wobbly(rand, grid[i][j], grid[i + 1][j], cell * 0.4))
      if (j + 1 < rows && rand() < CRACKLE_DENSITY) lines.push(wobbly(rand, grid[i][j], grid[i][j + 1], cell * 0.4))
    }
  }
  return lines
}

function createFissure(rand: Random, center: Point, radiusX: number, radiusY: number): Point[] {
  const angle = (rand() - 0.5) * Math.PI * 0.8 + (rand() < 0.5 ? 0 : Math.PI / 2)
  const length = radiusX * (0.9 + rand() * 0.6)
  const start = {
    x: center.x - Math.cos(angle) * length * 0.5 + (rand() - 0.5) * radiusX * 0.5,
    y: center.y - Math.sin(angle) * length * 0.5 + (rand() - 0.5) * radiusY * 0.6,
  }
  const points = [start]
  let heading = angle
  for (let segment = 0; segment < 5; segment++) {
    const last = points[points.length - 1]
    heading += (rand() - 0.5) * 0.9
    points.push({ x: last.x + (Math.cos(heading) * length) / 5, y: last.y + (Math.sin(heading) * length) / 5 })
  }
  return points
}

function createEmber(rand: Random, center: Point, radiusX: number, radiusY: number, dark: boolean): Ember {
  const control = Array.from({ length: CONTROL_POINTS }, (_, i) => {
    const angle = ((i + (rand() - 0.5) * 0.5) / CONTROL_POINTS) * Math.PI * 2
    const r = 0.8 + rand() * 0.25
    return { x: center.x + Math.cos(angle) * radiusX * r, y: center.y + Math.sin(angle) * radiusY * r }
  })
  const outline = smoothOutline(control)
  const fissures = Array.from({ length: FISSURES }, () => createFissure(rand, center, radiusX, radiusY))
  return {
    dark,
    center,
    radiusY,
    outline,
    edgeWidths: varyingWidths(rand, outline.length),
    fissures,
    fissureWidths: fissures.map(() => 0.5 + rand()),
    crackle: createCrackle(rand, center, radiusX, radiusY),
  }
}

export function createScene(width: number, height: number): Scene {
  const rand = seededRandom(SEED)
  const scale = width / REFERENCE_WIDTH
  const radiusX = width * 0.22
  const radiusY = width * 0.13
  const upperY = height - radiusY * 1.35
  const middleY = height - radiusY * 0.55
  const lowerY = height - radiusY * 0.05

  const middleRand = seededRandom(SEED + 1)
  const row = (positions: number[], y: number, dark = false) =>
    positions.map((position) => {
      const random = dark ? middleRand : rand
      return createEmber(
        random,
        { x: width * position + (random() - 0.5) * width * 0.04, y: y + (random() - 0.5) * radiusY * 0.3 },
        radiusX * (0.9 + random() * 0.2),
        radiusY * (0.9 + random() * 0.25),
        dark,
      )
    })
  const upper = row(UPPER_EMBERS, upperY)
  const lower = row(LOWER_EMBERS, lowerY)
  const embers = [...upper, ...row(MIDDLE_EMBERS, middleY, true), ...lower]

  const apex = { x: width * 0.5, y: upperY - Math.min(height * 0.32, width * 0.8) }
  const sticks = STICK_BASES.map((position, i) => {
    const rest = { x: width * position + (rand() - 0.5) * width * 0.04, y: upperY - radiusY * (0.5 + rand() * 0.5) }
    const top = { x: apex.x + (rand() - 0.5) * width * 0.08, y: apex.y + (rand() - 0.5) * width * 0.06 }
    const bottomY = i === FRONT_STICK ? upperY + radiusY * 0.2 : i === DEEP_STICK ? height : rest.y
    const stretch = (bottomY - top.y) / (rest.y - top.y)
    const from = { x: top.x + (rest.x - top.x) * stretch, y: bottomY }
    const to = { x: top.x + (top.x - rest.x) * 0.15, y: top.y + (top.y - rest.y) * 0.15 }
    const thickness = width * (0.03 + rand() * 0.012)
    const spots = Array.from({ length: SPOTS_PER_STICK }, () => ({
      along: 0.12 + rand() * 0.7,
      across: 0.1 + rand() * 0.25,
      radius: thickness * (0.2 + rand() * 0.14),
      threshold: 0.05 + rand() * 0.85,
    }))
    return { from, to, thickness, front: i === FRONT_STICK, spots }
  })

  return { width, height, scale, embers, sticks, flameBase: { x: apex.x, y: upperY - radiusY * 0.6 } }
}

export function randomPointOnEmber(scene: Scene): Point {
  const glowing = scene.embers.filter((ember) => !ember.dark)
  const ember = glowing[Math.floor(Math.random() * glowing.length)]
  const upper = ember.outline.filter((point) => point.y < ember.center.y && point.y < scene.height)
  return upper[Math.floor(Math.random() * upper.length)] ?? ember.center
}

export function randomPointOnStick(scene: Scene): Point {
  const stick = scene.sticks[Math.floor(Math.random() * scene.sticks.length)]
  const t = 0.1 + Math.random() * 0.7
  return { x: stick.from.x + (stick.to.x - stick.from.x) * t, y: stick.from.y + (stick.to.y - stick.from.y) * t }
}
