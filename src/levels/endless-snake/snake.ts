export type Direction = 'up' | 'down' | 'left' | 'right'

export const COLUMNS = 4
export const TICK_MS = 350

const VANISH_STAGGER_MAX_MS = 60
const VANISH_TOTAL_MAX_MS = 1500
export const VANISH_FADE_MS = 250
const RESTART_DELAY_MS = 1000
const QUEUE_LIMIT = 3

const VECTORS: Record<Direction, [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
}

const OPPOSITE: Record<Direction, Direction> = { up: 'down', down: 'up', left: 'right', right: 'left' }

type Move = Direction | 'hold'

export interface Segment {
  col: number
  row: number
  born: number
}

export type SnakePhase = 'running' | 'waiting' | 'vanishing' | 'won'

export class SnakeGame {
  readonly rows: number
  body: Segment[] = []
  phase: SnakePhase = 'running'
  crashedAt = 0
  wonAt = 0

  private direction: Direction = 'up'
  private queue: Move[] = []
  private interacted = false
  private nextTickAt = 0

  constructor(rows: number, now: number) {
    this.rows = rows
    this.reset(now)
  }

  get cellCount() {
    return COLUMNS * this.rows
  }

  get fillRatio() {
    return this.body.length / this.cellCount
  }

  get vanishStagger() {
    return Math.min(VANISH_STAGGER_MAX_MS, VANISH_TOTAL_MAX_MS / Math.max(1, this.body.length))
  }

  touch(now: number) {
    if (this.phase !== 'running' && this.phase !== 'waiting') return
    this.interacted = true
    if (this.phase === 'waiting') {
      this.phase = 'running'
      this.nextTickAt = now + TICK_MS
    }
  }

  swipe(direction: Direction, now: number) {
    this.touch(now)
    if (this.phase !== 'running' || this.queue.length >= QUEUE_LIMIT) return
    const planned = this.queue.findLast((move): move is Direction => move !== 'hold') ?? this.direction
    if (direction === planned) return
    this.queue.push(direction === OPPOSITE[planned] ? 'hold' : direction)
  }

  update(now: number) {
    if (this.phase === 'running') {
      while (this.phase === 'running' && now >= this.nextTickAt) {
        this.tick(this.nextTickAt)
        this.nextTickAt += TICK_MS
      }
    } else if (this.phase === 'vanishing') {
      const vanished = this.crashedAt + (this.body.length - 1) * this.vanishStagger + VANISH_FADE_MS
      if (now >= vanished + RESTART_DELAY_MS) this.reset(now)
    }
  }

  private reset(now: number) {
    this.body = []
    this.direction = 'up'
    this.queue = []
    this.interacted = false
    this.phase = 'running'
    this.nextTickAt = now + TICK_MS
  }

  private tick(now: number) {
    const move = this.queue.shift()
    if (move === 'hold') return
    if (move) this.direction = move

    const head = this.body.at(-1) ?? { col: 0, row: this.rows }
    const [dx, dy] = VECTORS[this.direction]
    const col = head.col + dx
    const row = head.row + dy

    const outside = col < 0 || col >= COLUMNS || row < 0 || row >= this.rows
    if (outside && !this.interacted && this.direction === 'up') {
      this.phase = 'waiting'
      return
    }
    if (outside || this.body.some((segment) => segment.col === col && segment.row === row)) {
      this.phase = 'vanishing'
      this.crashedAt = now
      this.queue = []
      return
    }

    this.body.push({ col, row, born: now })
    if (this.body.length === this.cellCount) {
      this.phase = 'won'
      this.wonAt = now
    }
  }
}
