import { useEffect, useEffectEvent, useState } from 'react'
import type { LevelProps } from '../../game/types'
import { useFullscreenCanvas } from '../../game/useFullscreenCanvas'
import { createLevelMeter, prepareMicrophoneContext, type LevelMeter } from '../../platform/microphone'
import { openMicrophone, stopStream } from '../../platform/userMedia'
import { BlowDetector } from './blowDetector'
import { Fire } from './fire'
import { renderFire } from './render'
import { createScene, randomPointOnEmber, randomPointOnStick, type Scene } from './scene'
import { Sparks } from './sparks'
import './EmberBlowLevel.css'

const MAX_STEP_S = 0.05
const SPARKS_PER_S = 10
const EXTRA_SPARKS_PER_S = 40

type Microphone = 'pending' | 'on' | 'off'

export default function EmberBlowLevel({ onProgress, onComplete }: LevelProps) {
  const canvasRef = useFullscreenCanvas('#000')
  const [microphone, setMicrophone] = useState<Microphone>('pending')

  const reportFill = useEffectEvent((ratio: number) => onProgress(ratio))
  const complete = useEffectEvent(() => onComplete())

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const fire = new Fire()
    const detector = new BlowDetector()
    const sparks = new Sparks()
    let meter: LevelMeter | null = null
    let scene: Scene | null = null
    let opening = false
    let finished = false
    let last = performance.now()
    let reportedPercent = -1
    let frame = 0

    const connect = () => {
      if (meter || opening || finished) return
      opening = true
      prepareMicrophoneContext()
      void openMicrophone().then((stream) => {
        opening = false
        if (finished) return stopStream(stream)
        meter = stream && createLevelMeter(stream)
        setMicrophone(meter ? 'on' : 'off')
      })
    }

    const loop = (now: number) => {
      const dt = Math.min(MAX_STEP_S, Math.max(0, (now - last) / 1000))
      last = now
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      if (!scene || scene.width !== width || scene.height !== height) scene = createScene(width, height)
      const current = scene

      if (meter) detector.update(meter.readDecibels(), dt)
      const blowing = meter !== null && detector.blowing
      fire.update(blowing, dt)
      if (blowing && fire.phase !== 'burning') {
        const perSecond = SPARKS_PER_S + EXTRA_SPARKS_PER_S * detector.strength
        const fromSticks = fire.phase === 'flame'
        sparks.emit(perSecond, dt, current.scale, () =>
          fromSticks && Math.random() < 0.5 ? randomPointOnStick(current) : randomPointOnEmber(current),
        )
      }
      sparks.update(dt, current.scale)
      renderFire(ctx, current, fire, sparks, now / 1000)

      const percent = Math.floor(fire.progress * 100)
      if (percent !== reportedPercent) {
        reportedPercent = percent
        reportFill(fire.progress)
      }
      if (fire.flame >= 1 && !finished) {
        finished = true
        meter?.close()
        meter = null
        complete()
      }
      frame = requestAnimationFrame(loop)
    }

    connect()
    frame = requestAnimationFrame(loop)
    canvas.addEventListener('pointerup', connect)
    return () => {
      finished = true
      cancelAnimationFrame(frame)
      meter?.close()
      canvas.removeEventListener('pointerup', connect)
    }
  }, [canvasRef])

  return (
    <>
      <canvas ref={canvasRef} className="ember-blow" />
      {microphone === 'off' && (
        <svg className="ember-blow__muted" viewBox="0 0 64 64" aria-hidden="true">
          <rect x="23" y="4" width="18" height="34" rx="9" fill="currentColor" />
          <path d="M14 28a18 18 0 0 0 36 0M32 46v10M22 58h20" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          <path d="M8 8 56 56" stroke="#000" strokeWidth="10" />
          <path d="M8 8 56 56" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        </svg>
      )}
    </>
  )
}
