import { fromCamera, toCamera, type Vec3, type View } from './view'

const DOT_COLOR = '#333'
const DOT_RADIUS = 3.6
const SHADOW_PX = 48
const CROSS_COLOR = '#bbb'
const CROSS_ARM = 9
const CROSS_WIDTH = 1.5
const NEAR = 0.05

export interface Point {
  x: number
  y: number
}

export interface Screen {
  width: number
  height: number
  focal: number
}

function clipNear(points: Vec3[]): Vec3[] {
  const clipped: Vec3[] = []
  points.forEach((current, i) => {
    const previous = points[(i + points.length - 1) % points.length]
    const currentIn = current[2] >= NEAR
    if (currentIn !== previous[2] >= NEAR) {
      const t = (NEAR - previous[2]) / (current[2] - previous[2])
      clipped.push([previous[0] + (current[0] - previous[0]) * t, previous[1] + (current[1] - previous[1]) * t, NEAR])
    }
    if (currentIn) clipped.push(current)
  })
  return clipped
}

const project = ({ width, height, focal }: Screen, [x, y, z]: Vec3): Point => ({
  x: width / 2 + (focal * x) / z,
  y: height / 2 - (focal * y) / z,
})

function edgeDistance(p: Point, polygon: Point[]) {
  let best = Infinity
  polygon.forEach((a, i) => {
    const b = polygon[(i + 1) % polygon.length]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const t = Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)))
    best = Math.min(best, Math.hypot(p.x - a.x - dx * t, p.y - a.y - dy * t))
  })
  return best
}

function shadeAt(p: Point, shadows: Point[][]) {
  let shade = 1
  for (const polygon of shadows) {
    if (polygon.length < 3) continue
    const t = Math.min(1, edgeDistance(p, polygon) / SHADOW_PX)
    shade = Math.min(shade, t * t * (3 - 2 * t))
  }
  return shade
}

export function drawDots(
  ctx: CanvasRenderingContext2D,
  screen: Screen,
  view: View,
  dots: Vec3[],
  shadows: Point[][],
) {
  ctx.fillStyle = DOT_COLOR
  const lit = new Path2D()
  for (const dot of dots) {
    const camera = toCamera(view, dot)
    if (camera[2] < NEAR) continue
    const p = project(screen, camera)
    if (p.x < -DOT_RADIUS || p.y < -DOT_RADIUS || p.x > screen.width + DOT_RADIUS || p.y > screen.height + DOT_RADIUS) {
      continue
    }
    const shade = shadeAt(p, shadows)
    if (shade <= 0) continue
    if (shade >= 1) {
      lit.moveTo(p.x + DOT_RADIUS, p.y)
      lit.arc(p.x, p.y, DOT_RADIUS, 0, 2 * Math.PI)
      continue
    }
    ctx.globalAlpha = shade
    ctx.beginPath()
    ctx.arc(p.x, p.y, DOT_RADIUS, 0, 2 * Math.PI)
    ctx.fill()
  }
  ctx.globalAlpha = 1
  ctx.fill(lit)
}

export function drawCross(ctx: CanvasRenderingContext2D, { width, height }: Screen) {
  ctx.strokeStyle = CROSS_COLOR
  ctx.lineWidth = CROSS_WIDTH
  ctx.beginPath()
  ctx.moveTo(width / 2 - CROSS_ARM, height / 2)
  ctx.lineTo(width / 2 + CROSS_ARM, height / 2)
  ctx.moveTo(width / 2, height / 2 - CROSS_ARM)
  ctx.lineTo(width / 2, height / 2 + CROSS_ARM)
  ctx.stroke()
}

export function fillPolygons(ctx: CanvasRenderingContext2D, polygons: Point[][], color: string) {
  ctx.fillStyle = color
  ctx.beginPath()
  for (const points of polygons) {
    if (points.length < 3) continue
    points.forEach(({ x, y }, i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)))
    ctx.closePath()
  }
  ctx.fill()
}

export function projectWorldPiece(screen: Screen, view: View, pose: View, outline: Point[]) {
  const { width, height, focal } = screen
  const camera = outline.map(({ x, y }) =>
    toCamera(view, fromCamera(pose, [(x - width / 2) / focal, (height / 2 - y) / focal, 1])),
  )
  return clipNear(camera).map((point) => project(screen, point))
}
