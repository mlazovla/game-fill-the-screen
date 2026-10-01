import type { Fire } from './fire'
import type { Ember, Point, Scene, Stick } from './scene'
import type { Sparks } from './sparks'

const DARK_EMBER = 0x33
const LIGHT_EMBER = 0xa8
const DARK_STICK = 0x2b
const LIT_STICK = 0xbd
const SPOT_GROW = 0.18
const FLAME_FILL_FROM = 0.65
const CRACKLE_ALPHA = 0.14
const FISSURE_ALPHA = 0.3
const DARK_BODY = 0x1a
const DARK_LINE_ALPHA = 0.08
const FLAME_TONGUES = [
  { offset: 0, width: 0.7, height: 1, phase: 0 },
  { offset: -0.5, width: 0.5, height: 0.72, phase: 1.7 },
  { offset: 0.5, width: 0.5, height: 0.78, phase: 3.1 },
  { offset: -0.85, width: 0.35, height: 0.45, phase: 4.2 },
  { offset: 0.85, width: 0.35, height: 0.5, phase: 5.3 },
]

const gray = (value: number, alpha = 1) => `rgb(${value} ${value} ${value} / ${alpha})`
const mix = (from: number, to: number, t: number) => Math.round(from + (to - from) * t)

function tracePath(ctx: CanvasRenderingContext2D, points: Point[], close: boolean) {
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  for (const point of points.slice(1)) ctx.lineTo(point.x, point.y)
  if (close) ctx.closePath()
}

function drawGlow(ctx: CanvasRenderingContext2D, scene: Scene, heat: number) {
  if (heat <= 0) return
  const center = scene.flameBase
  const radius = scene.width * 0.75
  const glow = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, radius)
  glow.addColorStop(0, `rgb(255 255 255 / ${0.16 * heat})`)
  glow.addColorStop(1, 'rgb(255 255 255 / 0)')
  ctx.fillStyle = glow
  ctx.fillRect(center.x - radius, center.y - radius, radius * 2, radius * 2)
}

function drawStick(ctx: CanvasRenderingContext2D, stick: Stick, light: number, heat: number, time: number) {
  const dx = stick.to.x - stick.from.x
  const dy = stick.to.y - stick.from.y
  const length = Math.hypot(dx, dy)
  const angle = Math.atan2(dy, dx)
  const down = Math.cos(angle) >= 0 ? 1 : -1
  const half = stick.thickness / 2

  ctx.save()
  ctx.translate(stick.from.x, stick.from.y)
  ctx.rotate(angle)
  ctx.beginPath()
  ctx.roundRect(0, -half, length, half * 2, half * 0.6)

  const across = ctx.createLinearGradient(0, -half * down, 0, half * down)
  across.addColorStop(0, gray(DARK_STICK))
  across.addColorStop(0.45, gray(DARK_STICK))
  across.addColorStop(1, gray(mix(DARK_STICK, LIT_STICK, light)))
  ctx.fillStyle = across
  ctx.fill()

  const along = ctx.createLinearGradient(0, 0, length, 0)
  along.addColorStop(0, gray(0, 0))
  along.addColorStop(1, gray(0, 0.55 * light))
  ctx.fillStyle = along
  ctx.fill()

  ctx.fillStyle = '#fff'
  stick.spots.forEach((spot, i) => {
    const grown = Math.min(1, (heat - spot.threshold) / SPOT_GROW)
    if (grown <= 0) return
    const radius = spot.radius * grown * (1 + 0.12 * Math.sin(time * 9 + i * 2.1))
    ctx.beginPath()
    ctx.ellipse(spot.along * length, spot.across * half * 2 * down, radius * 1.8, radius, 0, 0, Math.PI * 2)
    ctx.fill()
  })
  ctx.restore()
}

function strokeLines(ctx: CanvasRenderingContext2D, lines: Point[][]) {
  ctx.beginPath()
  for (const line of lines) {
    ctx.moveTo(line[0].x, line[0].y)
    for (const point of line.slice(1)) ctx.lineTo(point.x, point.y)
  }
  ctx.stroke()
}

function strokeVarying(ctx: CanvasRenderingContext2D, points: Point[], widths: number[], width: number, closed: boolean) {
  const count = closed ? points.length : points.length - 1
  for (let i = 0; i < count; i++) {
    const next = (i + 1) % points.length
    ctx.lineWidth = width * (widths[i] + widths[next]) * 0.5
    ctx.beginPath()
    ctx.moveTo(points[i].x, points[i].y)
    ctx.lineTo(points[next].x, points[next].y)
    ctx.stroke()
  }
}

function drawDarkEmber(ctx: CanvasRenderingContext2D, ember: Ember, scale: number) {
  ctx.fillStyle = gray(DARK_BODY)
  ctx.fill()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = gray(255, DARK_LINE_ALPHA)
  ctx.lineWidth = 0.7 * scale
  strokeLines(ctx, ember.crackle)
  ctx.strokeStyle = gray(255, DARK_LINE_ALPHA * 3)
  strokeVarying(ctx, ember.outline, ember.edgeWidths, 3 * scale, true)
}

function drawEmber(ctx: CanvasRenderingContext2D, ember: Ember, heat: number, scale: number) {
  const { center, radiusY } = ember
  ctx.save()
  tracePath(ctx, ember.outline, true)
  ctx.clip()
  if (ember.dark) {
    drawDarkEmber(ctx, ember, scale)
    ctx.restore()
    return
  }

  ctx.fillStyle = gray(mix(DARK_EMBER, LIGHT_EMBER, heat))
  ctx.fill()

  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = `rgb(255 255 255 / ${CRACKLE_ALPHA + (1 - CRACKLE_ALPHA) * heat})`
  ctx.lineWidth = (0.7 + heat * 1.6) * scale
  strokeLines(ctx, ember.crackle)

  ctx.strokeStyle = `rgb(255 255 255 / ${FISSURE_ALPHA + (1 - FISSURE_ALPHA) * Math.min(1, heat * 1.5)})`
  ember.fissures.forEach((fissure, i) => {
    const widths = fissure.map((_, k) => ember.fissureWidths[i] * (0.4 + Math.sin((k / (fissure.length - 1)) * Math.PI)))
    strokeVarying(ctx, fissure, widths, (1.5 + heat * 7) * scale, false)
  })

  ctx.strokeStyle = '#fff'
  strokeVarying(ctx, ember.outline, ember.edgeWidths, (4 + heat * 22) * scale, true)

  const shade = ctx.createLinearGradient(0, center.y, 0, center.y + radiusY)
  shade.addColorStop(0, gray(0, 0))
  shade.addColorStop(1, gray(0, 0.95))
  ctx.fillStyle = shade
  ctx.fillRect(center.x - radiusY * 4, center.y, radiusY * 8, radiusY * 1.2)
  ctx.restore()
}

function drawFlame(ctx: CanvasRenderingContext2D, scene: Scene, progress: number, time: number) {
  const { width, height, flameBase: base } = scene
  const rise = 1 - (1 - progress) ** 2
  const tall = rise * height * 1.25
  const half = width * (0.2 + 0.45 * rise)

  ctx.fillStyle = '#fff'
  for (const tongue of FLAME_TONGUES) {
    const center = base.x + tongue.offset * half
    const w = half * tongue.width
    const h = tall * tongue.height * (1 + 0.08 * Math.sin(time * 9 + tongue.phase))
    const sway = Math.sin(time * 6 + tongue.phase) * w * 0.35
    ctx.beginPath()
    ctx.moveTo(center - w, base.y)
    ctx.bezierCurveTo(center - w * 1.05, base.y - h * 0.45, center - w * 0.25 + sway, base.y - h * 0.75, center + sway * 1.4, base.y - h)
    ctx.bezierCurveTo(center + w * 0.25 + sway, base.y - h * 0.75, center + w * 1.05, base.y - h * 0.45, center + w, base.y)
    ctx.closePath()
    ctx.fill()
  }
  ctx.fillRect(base.x - half * 1.3, base.y - 1, half * 2.6, height - base.y + 1)

  if (progress > FLAME_FILL_FROM) {
    ctx.fillStyle = `rgb(255 255 255 / ${(progress - FLAME_FILL_FROM) / (1 - FLAME_FILL_FROM)})`
    ctx.fillRect(0, 0, width, height)
  }
}

export function renderFire(ctx: CanvasRenderingContext2D, scene: Scene, fire: Fire, sparks: Sparks, time: number) {
  const { width, height, scale } = scene
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, width, height)

  const emberHeat = fire.emberHeat
  drawGlow(ctx, scene, emberHeat)
  const kindlingHeat = fire.kindlingHeat
  for (const stick of scene.sticks) if (!stick.front) drawStick(ctx, stick, emberHeat, kindlingHeat, time)
  for (const ember of scene.embers) drawEmber(ctx, ember, emberHeat, scale)
  for (const stick of scene.sticks) if (stick.front) drawStick(ctx, stick, emberHeat, kindlingHeat, time)
  sparks.draw(ctx, scale)
  if (fire.phase === 'burning') drawFlame(ctx, scene, fire.flame, time)
}
