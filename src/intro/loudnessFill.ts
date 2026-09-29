const WARMUP_S = 0.4
const WARMUP_SMOOTHING_S = 0.1
const SILENCE_DB = -100
const MIN_FLOOR_DB = -80
const FLOOR_RISE_DB_PER_S = 2
const MARGIN_DB = 6
const FULL_RATE_DB = 24
const FILL_SECONDS = 4

export class LoudnessFill {
  fill = 0
  rate = 0
  private floor: number | null = null
  private heard = 0

  update(decibels: number, dt: number) {
    if (decibels < SILENCE_DB) return
    this.heard += dt
    const level = Math.max(MIN_FLOOR_DB, decibels)
    if (this.floor === null || this.heard < WARMUP_S) {
      this.floor = this.floor === null ? level : this.floor + (level - this.floor) * Math.min(1, dt / WARMUP_SMOOTHING_S)
      return
    }
    this.floor = Math.min(level, this.floor + FLOOR_RISE_DB_PER_S * dt)
    this.rate = Math.min(1, Math.max(0, (level - this.floor - MARGIN_DB) / FULL_RATE_DB))
    this.fill = Math.min(1, this.fill + (this.rate * dt) / FILL_SECONDS)
  }
}
