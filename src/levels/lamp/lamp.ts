export interface Point {
  x: number
  y: number
}

export interface Pose {
  dx: number
  dy: number
  angle: number
}

export interface Layout {
  width: number
  height: number
  unit: number
  centerX: number
  tableY: number
  bulb: Point
  shadeRest: Point
  cordX: number
  cordTop: number
  beadRest: number
}

export const SHADE_TOP_HALF = 1.8
export const SHADE_BOTTOM_HALF = 2.8
export const SHADE_HEIGHT = 3.5
export const BULB_RADIUS = 0.6
export const BEAD_RADIUS = 0.22
const SHADE_TOP_ABOVE_BULB = 0.9
const BULB_ABOVE_TABLE = 4.6

export function createLayout(width: number, height: number): Layout {
  const unit = Math.min(width / 9, height / 15)
  const centerX = width / 2
  const tableY = height * 0.9
  const bulb = { x: centerX, y: tableY - BULB_ABOVE_TABLE * unit }
  return {
    width,
    height,
    unit,
    centerX,
    tableY,
    bulb,
    shadeRest: { x: centerX, y: bulb.y + (SHADE_HEIGHT / 2 - SHADE_TOP_ABOVE_BULB) * unit },
    cordX: centerX + 1.75 * unit,
    cordTop: bulb.y + 0.65 * unit,
    beadRest: tableY - 1.3 * unit,
  }
}

export function tableRestDy(layout: Layout) {
  return (layout.tableY - layout.shadeRest.y) / layout.unit - SHADE_HEIGHT / 2
}

export function shadeCenter(layout: Layout, pose: Pose): Point {
  return { x: layout.shadeRest.x + pose.dx * layout.unit, y: layout.shadeRest.y + pose.dy * layout.unit }
}

export function shadeCorners(layout: Layout, pose: Pose): Point[] {
  const center = shadeCenter(layout, pose)
  const cos = Math.cos(pose.angle)
  const sin = Math.sin(pose.angle)
  const half = SHADE_HEIGHT / 2
  const local = [
    [-SHADE_BOTTOM_HALF, half],
    [-SHADE_TOP_HALF, -half],
    [SHADE_TOP_HALF, -half],
    [SHADE_BOTTOM_HALF, half],
  ]
  return local.map(([x, y]) => ({
    x: center.x + (x * cos - y * sin) * layout.unit,
    y: center.y + (x * sin + y * cos) * layout.unit,
  }))
}

export function isOnShade(layout: Layout, pose: Pose, point: Point, margin: number) {
  const center = shadeCenter(layout, pose)
  const cos = Math.cos(-pose.angle)
  const sin = Math.sin(-pose.angle)
  const px = (point.x - center.x) / layout.unit
  const py = (point.y - center.y) / layout.unit
  const x = px * cos - py * sin
  const y = px * sin + py * cos
  const half = SHADE_HEIGHT / 2
  if (y < -half - margin || y > half + margin) return false
  const t = Math.min(1, Math.max(0, (y + half) / SHADE_HEIGHT))
  return Math.abs(x) <= SHADE_TOP_HALF + (SHADE_BOTTOM_HALF - SHADE_TOP_HALF) * t + margin
}

export function containsPoint(corners: Point[], point: Point) {
  let sign = 0
  for (let i = 0; i < corners.length; i++) {
    const side = Math.sign(cross(corners[i], corners[(i + 1) % corners.length], point))
    if (side === 0) continue
    if (sign !== 0 && side !== sign) return false
    sign = side
  }
  return true
}

const RESOLVE_ITERATIONS = 3

export function pushOffBulb(layout: Layout, pose: Pose, clearance: number): Point | null {
  const { bulb, unit } = layout
  const reach = (BULB_RADIUS + clearance) * unit
  const total = { x: 0, y: 0 }
  for (let iteration = 0; iteration < RESOLVE_ITERATIONS; iteration++) {
    const corners = shadeCorners(layout, pose)
    let pushed = false
    for (let i = 0; i < corners.length - 1; i++) {
      const a = corners[i]
      const b = corners[i + 1]
      const abx = b.x - a.x
      const aby = b.y - a.y
      const t = clamp01(((bulb.x - a.x) * abx + (bulb.y - a.y) * aby) / (abx * abx + aby * aby))
      const nearX = a.x + abx * t - bulb.x
      const nearY = a.y + aby * t - bulb.y
      const distance = Math.hypot(nearX, nearY)
      if (distance >= reach || distance === 0) continue
      const x = ((nearX / distance) * (reach - distance)) / unit
      const y = ((nearY / distance) * (reach - distance)) / unit
      pose.dx += x
      pose.dy += y
      total.x += x
      total.y += y
      pushed = true
    }
    if (!pushed) break
  }
  return total.x === 0 && total.y === 0 ? null : total
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

export function isOffScreen(layout: Layout, corners: Point[]) {
  return (
    corners.every((p) => p.x < 0) ||
    corners.every((p) => p.x > layout.width) ||
    corners.every((p) => p.y < 0) ||
    corners.every((p) => p.y > layout.height)
  )
}

const cross = (o: Point, a: Point, b: Point) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)

function segmentsCross(a: Point, b: Point, c: Point, d: Point) {
  const d1 = cross(c, d, a)
  const d2 = cross(c, d, b)
  const d3 = cross(a, b, c)
  const d4 = cross(a, b, d)
  return d1 * d2 < 0 && d3 * d4 < 0
}

export function isInShadow(light: Point, point: Point, corners: Point[]) {
  for (let i = 0; i < corners.length - 1; i++) {
    if (segmentsCross(light, point, corners[i], corners[i + 1])) return true
  }
  return false
}

export function shadowQuads(light: Point, corners: Point[], far: number): Point[][] {
  const away = (p: Point) => {
    const dx = p.x - light.x
    const dy = p.y - light.y
    const length = Math.hypot(dx, dy) || 1
    return { x: p.x + (dx / length) * far, y: p.y + (dy / length) * far }
  }
  const quads: Point[][] = []
  for (let i = 0; i < corners.length - 1; i++) {
    const a = corners[i]
    const b = corners[i + 1]
    quads.push([a, b, away(b), away(a)])
  }
  return quads
}

export function litFraction(layout: Layout, corners: Point[], columns: number, rows: number) {
  let lit = 0
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const point = { x: ((column + 0.5) / columns) * layout.width, y: ((row + 0.5) / rows) * layout.height }
      if (!isInShadow(layout.bulb, point, corners)) lit++
    }
  }
  return lit / (columns * rows)
}
