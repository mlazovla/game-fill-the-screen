import { useEffect, useEffectEvent, useState } from 'react'
import type { LevelProps } from '../../game/types'
import { useFullscreenCanvas } from '../../game/useFullscreenCanvas'
import { subscribeGravity } from '../../platform/deviceGravity'
import { createCrackWeb, traceCracks, type CrackWeb } from './crackWeb'
import { drawHammer } from './hammerShape'
import { Shatter } from './shatter'
import { playCrack, playShatter, playTing } from './sound'
import { subscribeSwings, type Swing } from './swingMeter'
import './HammerLevel.css'

type Hand = 'left' | 'right'
type Strike = 'small' | 'medium' | 'large' | 'extreme'

interface Debug {
  swing: Swing | null
  strike: Strike | null
  damage: number
  hand: Hand
}

const G = 9.81
const MEDIUM_G = 3
const LARGE_G = 9
const EXTREME_G = 15
const SMALL_MS = 140
const MEDIUM_MS = 200
const LARGE_MS = 200
const EXTREME_MS = 350
const MEDIUM_DAMAGE = 2
const SMALL_DAMAGE = 1
const BREAK_DAMAGE = 4
const EXTENT_BY_DAMAGE = [0, 0.2, 0.35, 0.6]
const CRACK_GROWTH = 12
const HAND_TILT = 0.25
const HAND_SETTLE_MS = 400
const FLIP_EASE = 10
const MAX_STEP_S = 0.05
const CRACK_COLOR = '#bbb'

const STRIKE_LABEL: Record<Strike, string> = { small: 'malý', medium: 'střední', large: 'velký', extreme: 'extrém' }
const HAND_LABEL: Record<Hand, string> = { left: 'levá', right: 'pravá' }

function classify(g: number, durationMs: number): Strike | null {
  if (g > EXTREME_G && durationMs > EXTREME_MS) return 'extreme'
  if (g >= LARGE_G && durationMs >= LARGE_MS) return 'large'
  if (g >= MEDIUM_G && durationMs >= MEDIUM_MS) return 'medium'
  if (durationMs >= SMALL_MS) return 'small'
  return null
}

export default function HammerLevel({ onProgress, onComplete, showUi }: LevelProps) {
  const canvasRef = useFullscreenCanvas('#000')
  const [debug, setDebug] = useState<Debug | null>(null)

  const reportFill = useEffectEvent((ratio: number) => onProgress(ratio))
  const complete = useEffectEvent(() => onComplete())

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    let width = canvas.clientWidth
    let height = canvas.clientHeight
    let web: CrackWeb = createCrackWeb(width, height)
    let damage = 0
    let extent = 0
    let targetExtent = 0
    let breakRequest: { long: boolean } | null = null
    let shatter: Shatter | null = null
    let finished = false
    let hand: Hand = 'right'
    let mirror = 1
    let swinging = false
    let calmAfter = 0
    let reportedPercent = -1
    let last = performance.now()
    let frame = 0

    let hasGyro = false

    const applyStrike = (strike: Strike, swing: Swing | null) => {
      if (shatter || breakRequest) return
      if (strike === 'small') {
        playTing()
        if (damage > 0) {
          damage += SMALL_DAMAGE
          playCrack(0.3)
        }
      } else if (strike === 'medium') {
        playCrack(0.8)
        damage += MEDIUM_DAMAGE
      } else {
        damage = BREAK_DAMAGE
      }

      if (damage >= BREAK_DAMAGE) {
        breakRequest = { long: strike === 'extreme' }
      } else {
        targetExtent = EXTENT_BY_DAMAGE[damage]
      }
      setDebug({ swing, strike, damage: Math.min(damage, BREAK_DAMAGE), hand })
    }

    const onSwing = (swing: Swing) => {
      swinging = false
      calmAfter = performance.now() + HAND_SETTLE_MS
      const strike = classify(swing.strength / G, swing.durationMs)
      if (strike) applyStrike(strike, swing)
      else setDebug({ swing, strike, damage: Math.min(damage, BREAK_DAMAGE), hand })
    }

    const detectGyro = (event: DeviceMotionEvent) => {
      if (event.rotationRate?.alpha == null) return
      hasGyro = true
      window.removeEventListener('devicemotion', detectGyro)
    }

    const onTap = () => {
      if (!hasGyro) applyStrike('medium', null)
    }

    const drawScene = (crackExtent: number) => {
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, width, height)
      drawHammer(ctx, width, height, mirror)
      if (crackExtent <= 0.001) return
      ctx.strokeStyle = CRACK_COLOR
      ctx.lineWidth = 1.2
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      traceCracks(ctx, web, crackExtent)
    }

    const loop = (now: number) => {
      const dt = Math.min(MAX_STEP_S, Math.max(0, (now - last) / 1000))
      last = now
      if (canvas.clientWidth !== width || canvas.clientHeight !== height) {
        width = canvas.clientWidth
        height = canvas.clientHeight
        if (damage === 0) web = createCrackWeb(width, height)
      }

      mirror += ((hand === 'right' ? 1 : -1) - mirror) * (1 - Math.exp(-FLIP_EASE * dt))
      extent += (targetExtent - extent) * (1 - Math.exp(-CRACK_GROWTH * dt))

      if (breakRequest && !shatter) {
        drawScene(1)
        const snapshot = document.createElement('canvas')
        snapshot.width = canvas.width
        snapshot.height = canvas.height
        snapshot.getContext('2d')?.drawImage(canvas, 0, 0)
        shatter = new Shatter(snapshot, canvas.width / width, web, width, height)
        playShatter(breakRequest.long)
      }

      let fill = 0
      if (shatter) {
        shatter.update(dt)
        ctx.fillStyle = '#fff'
        ctx.fillRect(0, 0, width, height)
        shatter.draw(ctx)
        fill = shatter.fallenFraction(height)
        if (fill >= 1 && !finished) {
          finished = true
          complete()
        }
      } else {
        drawScene(extent)
      }

      const percent = Math.floor(fill * 100)
      if (percent !== reportedPercent) {
        reportedPercent = percent
        reportFill(fill)
      }
      if (!finished) frame = requestAnimationFrame(loop)
    }

    const unsubscribeGravity = subscribeGravity((gravity) => {
      if (swinging || performance.now() < calmAfter) return
      if (gravity.x < -HAND_TILT) hand = 'right'
      else if (gravity.x > HAND_TILT) hand = 'left'
    })
    const unsubscribeSwings = subscribeSwings({
      onStart: () => {
        swinging = true
      },
      onSwing,
    })
    window.addEventListener('devicemotion', detectGyro)
    canvas.addEventListener('pointerdown', onTap)
    frame = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('devicemotion', detectGyro)
      canvas.removeEventListener('pointerdown', onTap)
      unsubscribeGravity()
      unsubscribeSwings()
    }
  }, [canvasRef])

  return (
    <>
      <canvas ref={canvasRef} className="hammer" />
      {showUi && debug && (
        <div className="hammer__debug">
          {debug.swing
            ? `${(debug.swing.strength / G).toFixed(1)} g · ${debug.strike ? STRIKE_LABEL[debug.strike] : 'krátký'} · ${Math.round(debug.swing.durationMs)} ms`
            : 'ťuknutí · střední'}{' '}
          · {debug.damage}/{BREAK_DAMAGE} · {HAND_LABEL[debug.hand]}
        </div>
      )}
    </>
  )
}
