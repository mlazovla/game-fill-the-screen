import { NoiseFloor } from '../../game/noiseFloor'

const START_DB = 12
const STOP_DB = 7
const FULL_DB = 30
const RELEASE_S = 0.2

export class BlowDetector {
  blowing = false
  strength = 0
  private floor = new NoiseFloor()
  private quiet = 0

  update(decibels: number, dt: number) {
    const excess = this.floor.excess(decibels, dt, this.blowing)
    if (excess === null) {
      this.blowing = false
      this.strength = 0
      return
    }
    if (excess > START_DB) {
      this.blowing = true
      this.quiet = 0
    } else if (this.blowing && excess < STOP_DB) {
      this.quiet += dt
      if (this.quiet > RELEASE_S) this.blowing = false
    }
    this.strength = Math.min(1, Math.max(0, (excess - STOP_DB) / (FULL_DB - STOP_DB)))
  }
}
