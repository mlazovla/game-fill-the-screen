import { useEffect, useEffectEvent, useRef, useState, type PointerEvent } from 'react'
import { openFrontCamera, stopStream } from '../platform/userMedia'
import monaLisaUrl from './assets/mona-lisa.jpg'
import { ContinueButton } from './IntroControls'
import {
  ADJUSTMENT_LABELS,
  ADJUSTMENT_LIMIT,
  coverCrop,
  createBrightnessMeter,
  INITIAL_ADJUSTMENTS,
  transferOf,
  type AdjustmentKey,
} from './pictureAdjust'
import { createPictureRenderer } from './pictureRenderer'

const TARGET_BRIGHTNESS = 0.9
const MEASURE_INTERVAL_MS = 150
const GESTURE_MIN_PX = 12
const MENU_ITEM_PX = 44
const RANGE_PER_WIDTH = 150

interface PictureSource {
  element: HTMLVideoElement | HTMLImageElement
  live: boolean
  mirrored: boolean
}

interface Gesture {
  pointerId: number
  x: number
  y: number
  mode: 'pending' | 'select' | 'adjust'
  key: AdjustmentKey
  startValue: number
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const formatValue = (value: number) => (value > 0 ? `+${value}` : `${value}`)

const sourceSize = ({ element }: PictureSource) =>
  element instanceof HTMLVideoElement
    ? { width: element.videoWidth, height: element.videoHeight, ready: element.readyState >= 2 }
    : { width: element.naturalWidth, height: element.naturalHeight, ready: element.complete }

export function PictureStep({ camera, onContinue }: { camera: boolean; onContinue: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const sourceRef = useRef<PictureSource | null>(null)
  const gestureRef = useRef<Gesture | null>(null)
  const [adjustments, setAdjustments] = useState(INITIAL_ADJUSTMENTS)
  const [selected, setSelected] = useState<AdjustmentKey>(ADJUSTMENT_LABELS[0][0])
  const [gestureMode, setGestureMode] = useState<Gesture['mode'] | null>(null)
  const [done, setDone] = useState(false)

  const currentTransfer = useEffectEvent(() => transferOf(adjustments))
  const finish = useEffectEvent(() => setDone(true))

  useEffect(() => {
    const video = videoRef.current
    if (done || !video) return

    let stream: MediaStream | null = null
    let cancelled = false
    const showImage = () => {
      const image = new Image()
      image.src = monaLisaUrl
      void image.decode().then(() => {
        if (!cancelled) sourceRef.current = { element: image, live: false, mirrored: false }
      })
    }

    if (!camera) {
      showImage()
    } else {
      void openFrontCamera().then((opened) => {
        if (cancelled) return stopStream(opened)
        if (!opened) return showImage()
        stream = opened
        video.srcObject = opened
        video.play().then(() => {
          if (!cancelled) sourceRef.current = { element: video, live: true, mirrored: true }
        }, showImage)
      })
    }

    return () => {
      cancelled = true
      sourceRef.current = null
      stopStream(stream)
      video.srcObject = null
    }
  }, [camera, done])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const renderer = createPictureRenderer(canvas)
    if (!renderer) {
      finish()
      return
    }

    const measureBrightness = createBrightnessMeter()
    let uploaded: PictureSource['element'] | null = null
    let lastMeasure = 0
    let frame = 0

    const loop = (now: number) => {
      frame = requestAnimationFrame(loop)
      const source = sourceRef.current
      if (!source) return
      const { width, height, ready } = sourceSize(source)
      if (!ready || !width || !height) return
      if (source.live || uploaded !== source.element) {
        renderer.upload(source.element)
        uploaded = source.element
      }
      const crop = coverCrop(width, height, canvas.clientWidth, canvas.clientHeight)
      const transfer = currentTransfer()
      renderer.draw(crop, source.mirrored, transfer)

      if (now - lastMeasure < MEASURE_INTERVAL_MS) return
      lastMeasure = now
      if (measureBrightness(source.element, width, height, crop, transfer) >= TARGET_BRIGHTNESS) {
        cancelAnimationFrame(frame)
        finish()
      }
    }

    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [])

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (done || gestureRef.current) return
    event.currentTarget.setPointerCapture(event.pointerId)
    gestureRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      mode: 'pending',
      key: selected,
      startValue: adjustments[selected],
    }
    setGestureMode('pending')
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current
    if (!gesture || gesture.pointerId !== event.pointerId || done) return
    const dx = event.clientX - gesture.x
    const dy = event.clientY - gesture.y
    if (gesture.mode === 'pending') {
      if (Math.hypot(dx, dy) < GESTURE_MIN_PX) return
      gesture.mode = Math.abs(dy) > Math.abs(dx) ? 'select' : 'adjust'
      setGestureMode(gesture.mode)
    }
    if (gesture.mode === 'select') {
      const start = ADJUSTMENT_LABELS.findIndex(([key]) => key === gesture.key)
      const index = clamp(start + Math.round(dy / MENU_ITEM_PX), 0, ADJUSTMENT_LABELS.length - 1)
      setSelected(ADJUSTMENT_LABELS[index][0])
    } else {
      const delta = (dx / event.currentTarget.clientWidth) * RANGE_PER_WIDTH
      const value = clamp(Math.round(gesture.startValue + delta), -ADJUSTMENT_LIMIT, ADJUSTMENT_LIMIT)
      setAdjustments((current) => ({ ...current, [gesture.key]: value }))
    }
  }

  const onPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (gestureRef.current?.pointerId !== event.pointerId) return
    gestureRef.current = null
    setGestureMode(null)
  }

  const selectedLabel = ADJUSTMENT_LABELS.find(([key]) => key === selected)?.[1]
  const menuOpen = gestureMode === 'pending' || gestureMode === 'select'

  return (
    <div
      className="intro-picture"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
    >
      <video ref={videoRef} className="intro-picture__video" playsInline muted />
      <canvas ref={canvasRef} className="intro-canvas" />
      {!done && (
        <div className={gestureMode === 'adjust' ? 'intro-picture__pill is-active' : 'intro-picture__pill'}>
          {selectedLabel} {formatValue(adjustments[selected])}
        </div>
      )}
      {menuOpen && !done && (
        <ul className="intro-picture__menu">
          {ADJUSTMENT_LABELS.map(([key, label]) => (
            <li key={key} className={key === selected ? 'is-selected' : undefined}>
              <span>{label}</span>
              <span>{formatValue(adjustments[key])}</span>
            </li>
          ))}
        </ul>
      )}
      {done && (
        <div className="intro-picture__white">
          <ContinueButton onClick={onContinue} />
        </div>
      )}
    </div>
  )
}
