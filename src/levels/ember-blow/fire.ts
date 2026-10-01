export type FirePhase = 'embers' | 'kindling' | 'flame' | 'burning'

const PHASE_BLOW_S = 6
const KEEP_S = 3
const HOLD_S = 5
const FADE_S = 3
const QUICK_FADE_S = 0.6
const FLAME_BLOW_S = 1
const FLAME_RISE_S = 1.6
const TOLERANCE_S = 0.05

type Cooling = 'none' | 'holding' | 'fading' | 'quick'

export class Fire {
  phase: FirePhase = 'embers'
  blown = 0
  flame = 0
  private wasBlowing = false
  private cooling: Cooling = 'none'
  private idle = 0
  private fadeRate = 0

  get heat() {
    return Math.min(1, this.blown / PHASE_BLOW_S)
  }

  get emberHeat() {
    return this.phase === 'embers' ? this.heat : 1
  }

  get kindlingHeat() {
    if (this.phase === 'embers') return 0
    return this.phase === 'kindling' ? this.heat : 1
  }

  get progress() {
    if (this.phase === 'burning') return 2 / 3 + this.flame / 3
    if (this.phase === 'flame') return 2 / 3 + Math.min(1, this.blown / FLAME_BLOW_S) / 6
    return (this.phase === 'embers' ? 0 : 1 / 3) + this.heat / 3
  }

  update(blowing: boolean, dt: number) {
    if (this.phase === 'burning') {
      this.flame = Math.min(1, this.flame + dt / FLAME_RISE_S)
      return
    }
    if (blowing) {
      this.wasBlowing = true
      this.cooling = 'none'
      this.blown += dt
      if (this.blown >= PHASE_BLOW_S && this.phase !== 'flame') {
        this.phase = this.phase === 'embers' ? 'kindling' : 'flame'
        this.blown = 0
      }
      return
    }
    if (this.wasBlowing) {
      this.wasBlowing = false
      this.idle = 0
      if (this.phase === 'flame' && this.blown >= FLAME_BLOW_S - TOLERANCE_S) {
        this.phase = 'burning'
        return
      }
      this.cooling = this.phase !== 'flame' && this.blown >= KEEP_S - TOLERANCE_S ? 'holding' : 'quick'
    }
    this.idle += dt
    if (this.cooling === 'holding' && this.idle >= HOLD_S) {
      this.cooling = 'fading'
      this.fadeRate = this.blown / FADE_S
    }
    if (this.cooling === 'fading') this.blown = Math.max(0, this.blown - this.fadeRate * dt)
    if (this.cooling === 'quick') this.blown = Math.max(0, this.blown - (KEEP_S / QUICK_FADE_S) * dt)
  }
}
