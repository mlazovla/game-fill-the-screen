import { eulerView, type Euler } from './view'

const MAX_PITCH = Math.PI / 2
const KEY_STEP = (2 * Math.PI) / 180

interface Point {
  x: number
  y: number
}

const KEY_TURNS: Record<string, Partial<Euler>> = {
  ArrowLeft: { yaw: KEY_STEP },
  ArrowRight: { yaw: -KEY_STEP },
  ArrowUp: { pitch: KEY_STEP },
  ArrowDown: { pitch: -KEY_STEP },
  KeyQ: { roll: KEY_STEP },
  KeyE: { roll: -KEY_STEP },
}

const centroid = (points: Point[]): Point => ({
  x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
  y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
})

const twistAngle = ([a, b]: Point[]) => Math.atan2(b.y - a.y, b.x - a.x)

export class TouchLook {
  private euler: Euler = { yaw: 0, pitch: 0, roll: 0 }
  private pointers = new Map<number, Point>()

  view() {
    return eulerView(this.euler)
  }

  down(id: number, point: Point) {
    this.pointers.set(id, point)
  }

  up(id: number) {
    this.pointers.delete(id)
  }

  move(id: number, point: Point, radiansPerPx: number) {
    if (!this.pointers.has(id)) return
    const before = [...this.pointers.values()]
    this.pointers.set(id, point)
    const after = [...this.pointers.values()]

    const from = centroid(before)
    const to = centroid(after)
    this.drag(to.x - from.x, to.y - from.y, radiansPerPx)
    if (after.length >= 2) {
      let delta = twistAngle(after) - twistAngle(before)
      if (delta > Math.PI) delta -= 2 * Math.PI
      if (delta < -Math.PI) delta += 2 * Math.PI
      this.turn({ roll: delta })
    }
  }

  key(code: string) {
    const turn = KEY_TURNS[code]
    if (turn) this.turn(turn)
    return turn !== undefined
  }

  private drag(dx: number, dy: number, radiansPerPx: number) {
    const { roll } = this.euler
    const levelX = dx * Math.cos(roll) + dy * Math.sin(roll)
    const levelUp = dx * Math.sin(roll) - dy * Math.cos(roll)
    this.turn({ yaw: levelX * radiansPerPx, pitch: -levelUp * radiansPerPx })
  }

  private turn({ yaw = 0, pitch = 0, roll = 0 }: Partial<Euler>) {
    this.euler.yaw += yaw
    this.euler.pitch = Math.min(MAX_PITCH, Math.max(-MAX_PITCH, this.euler.pitch + pitch))
    this.euler.roll += roll
  }
}
