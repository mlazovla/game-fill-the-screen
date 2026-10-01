import { NoiseFloor } from '../game/noiseFloor'

const MARGIN_DB = 6
const FULL_RATE_DB = 24
const FILL_SECONDS = 4

export class LoudnessFill {
  fill = 0
  rate = 0
  private floor = new NoiseFloor()

  update(decibels: number, dt: number) {
    const excess = this.floor.excess(decibels, dt)
    if (excess === null) return
    this.rate = Math.min(1, Math.max(0, (excess - MARGIN_DB) / FULL_RATE_DB))
    this.fill = Math.min(1, this.fill + (this.rate * dt) / FILL_SECONDS)
  }
}
