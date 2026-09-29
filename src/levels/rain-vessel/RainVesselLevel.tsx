import { useEffect, useEffectEvent } from 'react'
import type { LevelProps } from '../../game/types'
import { useFullscreenCanvas } from '../../game/useFullscreenCanvas'
import { requestMotionPermission, subscribeGravity, UPRIGHT_GRAVITY } from '../../platform/deviceGravity'
import { renderRain } from './render'
import { RainSimulation } from './simulation'
import { playDropImpact, startRainAmbience } from './sound'
import './RainVesselLevel.css'

const MAX_STEP_S = 0.05
const SENSOR_SMOOTHING = 12

export default function RainVesselLevel({ onProgress, onComplete }: LevelProps) {
  const canvasRef = useFullscreenCanvas('#000')

  const reportFill = useEffectEvent((ratio: number) => onProgress(ratio))
  const complete = useEffectEvent(() => onComplete())

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const sim = new RainSimulation({ onDropLanded: (relativeX) => playDropImpact(relativeX * 2 - 1) })
    const stopAmbience = startRainAmbience()
    const gravity = { ...UPRIGHT_GRAVITY }
    let sensed = { ...UPRIGHT_GRAVITY }
    let last = performance.now()
    let reportedPercent = -1
    let completed = false
    let frame = 0

    const unsubscribe = subscribeGravity((value) => {
      sensed = value
    })
    const askPermission = () => void requestMotionPermission()

    const loop = (now: number) => {
      const dt = Math.min(MAX_STEP_S, Math.max(0, (now - last) / 1000))
      last = now
      const blend = 1 - Math.exp(-SENSOR_SMOOTHING * dt)
      gravity.x += (sensed.x - gravity.x) * blend
      gravity.y += (sensed.y - gravity.y) * blend
      gravity.z += (sensed.z - gravity.z) * blend

      sim.step(dt, now, gravity, canvas.clientWidth, canvas.clientHeight)
      renderRain(ctx, sim, now)

      const percent = Math.floor(sim.fill * 100)
      if (percent !== reportedPercent) {
        reportedPercent = percent
        reportFill(sim.fill)
      }
      if (sim.completed && !completed) {
        completed = true
        complete()
      }
      frame = requestAnimationFrame(loop)
    }

    frame = requestAnimationFrame(loop)
    canvas.addEventListener('pointerup', askPermission)
    return () => {
      cancelAnimationFrame(frame)
      stopAmbience()
      unsubscribe()
      canvas.removeEventListener('pointerup', askPermission)
    }
  }, [canvasRef])

  return <canvas ref={canvasRef} className="rain-vessel" />
}
