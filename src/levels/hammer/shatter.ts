import { crackCells, type CrackWeb, type Point } from './crackWeb'

interface Shard {
  image: HTMLCanvasElement
  left: number
  top: number
  width: number
  height: number
  pivot: Point
  radius: number
  x: number
  y: number
  vx: number
  vy: number
  angle: number
  spin: number
  delay: number
}

const GRAVITY = 1500
const MIN_SPEED = 30
const MAX_SPEED = 160
const MAX_SPIN = 2.5
const RADIAL_DELAY_S = 0.35
const RANDOM_DELAY_S = 0.2
const EDGE_COLOR = '#bbb'

const between = (min: number, max: number) => min + Math.random() * (max - min)

export class Shatter {
  private shards: Shard[] = []
  private elapsed = 0

  constructor(snapshot: HTMLCanvasElement, dpr: number, web: CrackWeb, width: number, height: number) {
    for (const cell of crackCells(web)) {
      const xs = cell.corners.map((p) => p.x)
      const ys = cell.corners.map((p) => p.y)
      const pad = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) * 0.2
      const left = Math.max(0, Math.floor(Math.min(...xs) - pad))
      const top = Math.max(0, Math.floor(Math.min(...ys) - pad))
      const right = Math.min(width, Math.ceil(Math.max(...xs) + pad))
      const bottom = Math.min(height, Math.ceil(Math.max(...ys) + pad))
      if (right <= left || bottom <= top) continue

      const image = document.createElement('canvas')
      image.width = Math.ceil((right - left) * dpr)
      image.height = Math.ceil((bottom - top) * dpr)
      const ctx = image.getContext('2d')
      if (!ctx) continue
      ctx.scale(dpr, dpr)
      ctx.translate(-left, -top)
      ctx.save()
      ctx.clip(cell.path)
      ctx.drawImage(snapshot, 0, 0, snapshot.width / dpr, snapshot.height / dpr)
      ctx.restore()
      ctx.strokeStyle = EDGE_COLOR
      ctx.lineWidth = 1.5
      ctx.stroke(cell.path)

      const centroid = {
        x: xs.reduce((sum, x) => sum + x, 0) / xs.length,
        y: ys.reduce((sum, y) => sum + y, 0) / ys.length,
      }
      const away = { x: centroid.x - web.center.x, y: centroid.y - web.center.y }
      const reach = Math.hypot(away.x, away.y) || 1
      const speed = between(MIN_SPEED, MAX_SPEED)
      this.shards.push({
        image,
        left,
        top,
        width: right - left,
        height: bottom - top,
        pivot: { x: centroid.x - left, y: centroid.y - top },
        radius: Math.max(...cell.corners.map((p) => Math.hypot(p.x - centroid.x, p.y - centroid.y))),
        x: 0,
        y: 0,
        vx: (away.x / reach) * speed,
        vy: (away.y / reach) * speed,
        angle: 0,
        spin: between(-MAX_SPIN, MAX_SPIN),
        delay: (reach / web.maxRadius) * RADIAL_DELAY_S + Math.random() * RANDOM_DELAY_S,
      })
    }
  }

  update(dt: number) {
    this.elapsed += dt
    for (const shard of this.shards) {
      if (this.elapsed < shard.delay) continue
      shard.vy += GRAVITY * dt
      shard.x += shard.vx * dt
      shard.y += shard.vy * dt
      shard.angle += shard.spin * dt
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    for (const shard of this.shards) {
      ctx.save()
      ctx.translate(shard.left + shard.pivot.x + shard.x, shard.top + shard.pivot.y + shard.y)
      ctx.rotate(shard.angle)
      ctx.drawImage(shard.image, -shard.pivot.x, -shard.pivot.y, shard.width, shard.height)
      ctx.restore()
    }
  }

  fallenFraction(height: number) {
    if (this.shards.length === 0) return 1
    const fallen = this.shards.filter((shard) => shard.top + shard.pivot.y + shard.y - shard.radius > height)
    return fallen.length / this.shards.length
  }
}
