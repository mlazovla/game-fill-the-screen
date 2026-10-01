const TRAIL_POINTS = 7

interface Point {
  x: number
  y: number
}

interface Spark extends Point {
  vx: number
  vy: number
  curve: number
  age: number
  life: number
  trail: Point[]
}

const random = (min: number, max: number) => min + Math.random() * (max - min)

export class Sparks {
  list: Spark[] = []
  private pending = 0

  emit(perSecond: number, dt: number, scale: number, source: () => Point) {
    this.pending += perSecond * dt
    for (; this.pending >= 1; this.pending--) {
      const { x, y } = source()
      this.list.push({
        x,
        y,
        vx: random(-40, 40) * scale,
        vy: -random(220, 420) * scale,
        curve: random(-160, 160) * scale,
        age: 0,
        life: random(0.7, 1.4),
        trail: [],
      })
    }
  }

  update(dt: number, scale: number) {
    this.list = this.list.filter((spark) => {
      spark.trail.unshift({ x: spark.x, y: spark.y })
      if (spark.trail.length > TRAIL_POINTS) spark.trail.pop()
      spark.age += dt
      spark.vx += spark.curve * dt
      spark.vy += 80 * scale * dt
      spark.x += spark.vx * dt
      spark.y += spark.vy * dt
      return spark.age < spark.life
    })
  }

  draw(ctx: CanvasRenderingContext2D, scale: number) {
    ctx.lineCap = 'round'
    for (const spark of this.list) {
      const alpha = Math.min(1, (spark.life - spark.age) / (spark.life * 0.3))
      let previous: Point = spark
      spark.trail.forEach((point, i) => {
        ctx.strokeStyle = `rgb(255 255 255 / ${alpha * (1 - (i + 1) / (TRAIL_POINTS + 1))})`
        ctx.lineWidth = 1.6 * scale
        ctx.beginPath()
        ctx.moveTo(previous.x, previous.y)
        ctx.lineTo(point.x, point.y)
        ctx.stroke()
        previous = point
      })
      ctx.fillStyle = `rgb(255 255 255 / ${alpha})`
      ctx.beginPath()
      ctx.arc(spark.x, spark.y, 1.9 * scale, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}
