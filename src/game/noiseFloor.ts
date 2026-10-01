const WARMUP_S = 0.4
const WARMUP_SMOOTHING_S = 0.1
const SILENCE_DB = -100
const MIN_FLOOR_DB = -80
const FLOOR_RISE_DB_PER_S = 2

export class NoiseFloor {
  private floor: number | null = null
  private heard = 0

  excess(decibels: number, dt: number, holdFloor = false): number | null {
    if (decibels < SILENCE_DB) return null
    this.heard += dt
    const level = Math.max(MIN_FLOOR_DB, decibels)
    if (this.floor === null || this.heard < WARMUP_S) {
      this.floor = this.floor === null ? level : this.floor + (level - this.floor) * Math.min(1, dt / WARMUP_SMOOTHING_S)
      return null
    }
    this.floor = holdFloor ? Math.min(level, this.floor) : Math.min(level, this.floor + FLOOR_RISE_DB_PER_S * dt)
    return level - this.floor
  }
}
