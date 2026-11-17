import { BEAD_RADIUS, BULB_RADIUS, shadowQuads, type Layout, type Point } from './lamp'

const TABLE = 0x22
const LAMP = 0x2b
const DARK_SHADE = 0x33
const DARK_BULB = 0x3a

const gray = (value: number, alpha = 1) => `rgb(${value} ${value} ${value} / ${alpha})`

export interface LampView {
  lit: boolean
  corners: Point[]
  pull: number
  fade: number
}

function fillPolygon(ctx: CanvasRenderingContext2D, points: Point[]) {
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  for (const point of points.slice(1)) ctx.lineTo(point.x, point.y)
  ctx.closePath()
  ctx.fill()
}

function drawBase(ctx: CanvasRenderingContext2D, layout: Layout) {
  const { centerX: x, tableY: y, unit: u, bulb } = layout
  const neckY = y - 2.6 * u
  const stemTop = bulb.y + 0.9 * u
  ctx.fillStyle = gray(LAMP)
  ctx.beginPath()
  ctx.moveTo(x - 0.9 * u, y)
  ctx.lineTo(x + 0.9 * u, y)
  ctx.bezierCurveTo(x + 1.6 * u, y - 1.0 * u, x + 1.2 * u, y - 2.0 * u, x + 0.3 * u, neckY)
  ctx.lineTo(x + 0.18 * u, stemTop)
  ctx.lineTo(x - 0.18 * u, stemTop)
  ctx.lineTo(x - 0.3 * u, neckY)
  ctx.bezierCurveTo(x - 1.2 * u, y - 2.0 * u, x - 1.6 * u, y - 1.0 * u, x - 0.9 * u, y)
  ctx.closePath()
  ctx.fill()

  ctx.beginPath()
  ctx.roundRect(x - 0.4 * u, bulb.y + 0.35 * u, 0.8 * u, 0.6 * u, 0.1 * u)
  ctx.fill()
}

function drawCord(ctx: CanvasRenderingContext2D, layout: Layout, pull: number) {
  const { unit: u, cordX, cordTop } = layout
  const beadY = layout.beadRest + pull * u
  ctx.strokeStyle = gray(LAMP)
  ctx.lineWidth = Math.max(1.5, 0.07 * u)
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(layout.centerX + 0.35 * u, cordTop)
  ctx.lineTo(cordX, cordTop)
  ctx.lineTo(cordX, beadY)
  ctx.stroke()
  ctx.fillStyle = gray(LAMP)
  ctx.beginPath()
  ctx.arc(cordX, beadY, BEAD_RADIUS * u, 0, Math.PI * 2)
  ctx.fill()
}

function drawBulb(ctx: CanvasRenderingContext2D, layout: Layout, lit: boolean) {
  const { bulb, unit } = layout
  ctx.beginPath()
  ctx.arc(bulb.x, bulb.y, BULB_RADIUS * unit, 0, Math.PI * 2)
  ctx.fillStyle = lit ? '#fff' : gray(DARK_BULB)
  ctx.fill()
}

export function renderLamp(ctx: CanvasRenderingContext2D, layout: Layout, view: LampView) {
  const { width, height } = layout
  ctx.fillStyle = view.lit ? '#fff' : '#000'
  ctx.fillRect(0, 0, width, height)

  if (view.lit) {
    ctx.fillStyle = '#000'
    for (const quad of shadowQuads(layout.bulb, view.corners, (width + height) * 3)) fillPolygon(ctx, quad)
  }

  ctx.globalCompositeOperation = 'lighten'
  ctx.fillStyle = gray(TABLE)
  ctx.fillRect(0, layout.tableY, width, height - layout.tableY)
  drawBase(ctx, layout)
  drawCord(ctx, layout, view.pull)
  drawBulb(ctx, layout, view.lit)
  ctx.globalCompositeOperation = 'source-over'

  ctx.fillStyle = view.lit ? '#fff' : gray(DARK_SHADE)
  fillPolygon(ctx, view.corners)

  if (view.fade > 0) {
    ctx.fillStyle = gray(255, view.fade)
    ctx.fillRect(0, 0, width, height)
  }
}
