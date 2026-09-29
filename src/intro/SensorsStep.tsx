import { useEffect, useRef, useState } from 'react'
import { useFullscreenCanvas } from '../game/useFullscreenCanvas'
import { requestMotionPermission } from '../platform/deviceGravity'
import { subscribeShake } from '../platform/deviceShake'
import { ContinueButton, ShakeIcon, SkipButton } from './IntroControls'
import { COLUMN_PX, StoneHeap } from './stoneHeap'

const SHAKE_THRESHOLD = 4
const FULL_SIZE_SHAKE = 12
const STONES_PER_SHAKE = 0.8
const MAX_SHAKE_STONES_PER_S = 14
const SKIP_STONES_PER_S = 60
const SKIP_STONE_SIZE = 0.8
const TARGET_FILL = 0.97
const PROMPT_STONES = 5
const MAX_STEP_S = 0.05

type Permission = 'idle' | 'asking' | 'granted' | 'denied'

const PERMISSION_LABELS: Record<Permission, string> = {
  idle: 'Povolit',
  asking: 'Povolit',
  granted: 'Povoleno',
  denied: 'Nepovoleno',
}

function drawHeap(ctx: CanvasRenderingContext2D, heap: StoneHeap) {
  const { width, height, surface } = heap
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.moveTo(0, height)
  surface.forEach((y, c) => ctx.lineTo(c * COLUMN_PX, y))
  ctx.lineTo(width, surface[surface.length - 1])
  ctx.lineTo(width, height)
  ctx.fill()
  for (const stone of heap.falling) {
    const [first, ...rest] = heap.outlineOf(stone)
    ctx.beginPath()
    ctx.moveTo(first.x, first.y)
    for (const point of rest) ctx.lineTo(point.x, point.y)
    ctx.fill()
  }
}

export function SensorsStep({ onContinue }: { onContinue: () => void }) {
  const canvasRef = useFullscreenCanvas('#000')
  const [heap] = useState(() => new StoneHeap())
  const [permission, setPermission] = useState<Permission>('idle')
  const [skipping, setSkipping] = useState(false)
  const [filled, setFilled] = useState(false)
  const [promptHidden, setPromptHidden] = useState(false)
  const skippingRef = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    let last = performance.now()
    let frame = 0
    const loop = (now: number) => {
      const dt = Math.min(MAX_STEP_S, Math.max(0, (now - last) / 1000))
      last = now
      heap.resize(canvas.clientWidth, canvas.clientHeight)
      if (skippingRef.current) heap.drop(SKIP_STONES_PER_S * dt, SKIP_STONE_SIZE)
      heap.step(dt)
      drawHeap(ctx, heap)
      if (heap.settled >= PROMPT_STONES) setPromptHidden(true)
      if (heap.fill >= TARGET_FILL) {
        setFilled(true)
        return
      }
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [canvasRef, heap])

  useEffect(() => {
    if (permission !== 'granted') return
    return subscribeShake((acceleration, dt) => {
      const excess = Math.max(0, acceleration - SHAKE_THRESHOLD)
      heap.drop(Math.min(MAX_SHAKE_STONES_PER_S, excess * STONES_PER_SHAKE) * dt, excess / FULL_SIZE_SHAKE)
    })
  }, [heap, permission])

  const allow = () => {
    setPermission('asking')
    void requestMotionPermission().then((granted) => setPermission(granted ? 'granted' : 'denied'))
  }

  const skip = () => {
    skippingRef.current = true
    setSkipping(true)
  }

  return (
    <div className="intro-sensors">
      <canvas ref={canvasRef} className="intro-canvas" />
      <div className={filled ? 'intro-overlay is-hidden' : 'intro-overlay'}>
        {permission === 'granted' && <ShakeIcon />}
        <div className={promptHidden ? 'intro-prompt is-hidden' : 'intro-prompt'}>
          <p className="intro-text">Hra vyžaduje přístup k senzorům</p>
          <button type="button" className="intro-button" disabled={permission !== 'idle'} onClick={allow}>
            {PERMISSION_LABELS[permission]}
          </button>
        </div>
      </div>
      {(permission === 'granted' || permission === 'denied') && !skipping && !filled && <SkipButton onClick={skip} />}
      {filled && (
        <div className="intro-finish is-whiteout">
          <ContinueButton onClick={onContinue} />
        </div>
      )}
    </div>
  )
}
