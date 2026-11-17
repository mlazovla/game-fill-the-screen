export interface Point {
  x: number
  y: number
}

export interface CrackWeb {
  center: Point
  maxRadius: number
  rays: Point[][]
  rings: boolean[][]
}

export interface Cell {
  path: Path2D
  corners: Point[]
}

const RAY_COUNT = 14
const RING_COUNT = 7
const RADIUS_EXPONENT = 1.35
const RADIUS_JITTER = 0.14
const ANGLE_JITTER = 0.07
const RING_KEEP = 0.75
const RING_SAG = 0.86

const jitter = (amount: number) => (Math.random() * 2 - 1) * amount
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)

export function createCrackWeb(width: number, height: number): CrackWeb {
  const center = { x: width / 2, y: height / 2 }
  const maxRadius = Math.hypot(width, height) * 0.6
  const step = (Math.PI * 2) / RAY_COUNT
  const offset = Math.random() * step
  const rays = Array.from({ length: RAY_COUNT }, (_, i) => {
    const angle = offset + i * step + jitter(step * 0.25)
    return [
      center,
      ...Array.from({ length: RING_COUNT }, (_, j) => {
        const outer = j === RING_COUNT - 1
        const radius = maxRadius * ((j + 1) / RING_COUNT) ** RADIUS_EXPONENT * (outer ? 1.2 : 1 + jitter(RADIUS_JITTER))
        const bend = angle + jitter(ANGLE_JITTER)
        return { x: center.x + Math.cos(bend) * radius, y: center.y + Math.sin(bend) * radius }
      }),
    ]
  })
  const rings = rays.map(() => Array.from({ length: RING_COUNT + 1 }, () => Math.random() < RING_KEEP))
  return { center, maxRadius, rays, rings }
}

function ringControl(web: CrackWeb, a: Point, b: Point) {
  const { center } = web
  return {
    x: center.x + ((a.x + b.x) / 2 - center.x) * RING_SAG,
    y: center.y + ((a.y + b.y) / 2 - center.y) * RING_SAG,
  }
}

export function traceCracks(ctx: CanvasRenderingContext2D, web: CrackWeb, extent: number) {
  const limit = web.maxRadius * extent
  ctx.beginPath()
  for (const ray of web.rays) {
    ctx.moveTo(ray[0].x, ray[0].y)
    for (let j = 1; j < ray.length; j++) {
      const from = ray[j - 1]
      const to = ray[j]
      const r0 = distance(from, web.center)
      const r1 = distance(to, web.center)
      if (r1 <= limit) {
        ctx.lineTo(to.x, to.y)
        continue
      }
      if (r0 < limit) {
        const t = (limit - r0) / (r1 - r0)
        ctx.lineTo(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t)
      }
      break
    }
  }

  web.rays.forEach((ray, i) => {
    const next = web.rays[(i + 1) % web.rays.length]
    for (let j = 1; j < ray.length; j++) {
      if (!web.rings[i][j]) continue
      const a = ray[j]
      const b = next[j]
      if (Math.max(distance(a, web.center), distance(b, web.center)) > limit * 0.9) continue
      const control = ringControl(web, a, b)
      ctx.moveTo(a.x, a.y)
      ctx.quadraticCurveTo(control.x, control.y, b.x, b.y)
    }
  })
  ctx.stroke()
}

export function crackCells(web: CrackWeb): Cell[] {
  const cells: Cell[] = []
  web.rays.forEach((ray, i) => {
    const next = web.rays[(i + 1) % web.rays.length]
    for (let j = 1; j < ray.length; j++) {
      const path = new Path2D()
      path.moveTo(ray[j - 1].x, ray[j - 1].y)
      if (j > 1) {
        const inner = ringControl(web, ray[j - 1], next[j - 1])
        path.quadraticCurveTo(inner.x, inner.y, next[j - 1].x, next[j - 1].y)
      }
      path.lineTo(next[j].x, next[j].y)
      const outer = ringControl(web, next[j], ray[j])
      path.quadraticCurveTo(outer.x, outer.y, ray[j].x, ray[j].y)
      path.closePath()
      const corners = j > 1 ? [ray[j - 1], next[j - 1], next[j], ray[j]] : [ray[0], next[j], ray[j]]
      cells.push({ path, corners })
    }
  })
  return cells
}
