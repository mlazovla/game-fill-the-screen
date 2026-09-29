export interface Point {
  x: number
  y: number
}

export interface SurfacePoint extends Point {
  onSurface: boolean
}

export interface LiquidShape {
  nx: number
  ny: number
  offset: number
  polygon: SurfacePoint[]
}

const SOLVE_ITERATIONS = 24

function corners(width: number, height: number): Point[] {
  return [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height },
  ]
}

export function clipByHalfPlane(width: number, height: number, nx: number, ny: number, offset: number) {
  const rect = corners(width, height)
  const depth = (p: Point) => nx * p.x + ny * p.y - offset
  const polygon: SurfacePoint[] = []
  rect.forEach((a, i) => {
    const b = rect[(i + 1) % rect.length]
    const da = depth(a)
    const db = depth(b)
    if (da >= 0) polygon.push({ ...a, onSurface: false })
    if (da >= 0 !== db >= 0) {
      const t = da / (da - db)
      polygon.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, onSurface: true })
    }
  })
  return polygon
}

export function polygonArea(polygon: Point[]) {
  let sum = 0
  polygon.forEach((a, i) => {
    const b = polygon[(i + 1) % polygon.length]
    sum += a.x * b.y - b.x * a.y
  })
  return Math.abs(sum) / 2
}

export function shapeForArea(width: number, height: number, angle: number, area: number): LiquidShape {
  const nx = Math.cos(angle)
  const ny = Math.sin(angle)
  const projections = corners(width, height).map((p) => nx * p.x + ny * p.y)
  let low = Math.min(...projections)
  let high = Math.max(...projections)

  if (area <= 0) return { nx, ny, offset: Infinity, polygon: [] }
  if (area >= width * height) return { nx, ny, offset: low, polygon: clipByHalfPlane(width, height, nx, ny, low) }

  for (let i = 0; i < SOLVE_ITERATIONS; i++) {
    const middle = (low + high) / 2
    if (polygonArea(clipByHalfPlane(width, height, nx, ny, middle)) > area) low = middle
    else high = middle
  }
  const offset = (low + high) / 2
  return { nx, ny, offset, polygon: clipByHalfPlane(width, height, nx, ny, offset) }
}

export function submergedOpening(shape: LiquidShape, width: number, height: number): [number, number] | null {
  if (shape.polygon.length === 0) return null
  const { nx, ny, offset } = shape
  if (Math.abs(nx) < 1e-9) return ny * height >= offset ? [0, width] : null
  const bound = (offset - ny * height) / nx
  const from = nx > 0 ? Math.max(0, bound) : 0
  const to = nx > 0 ? width : Math.min(width, bound)
  return to > from ? [from, to] : null
}
