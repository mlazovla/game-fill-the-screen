import { useEffect, useRef, useState } from 'react'
import { createLevelMeter, prepareMicrophoneContext, type LevelMeter } from '../platform/microphone'
import { requestMediaAccess, stopStream } from '../platform/userMedia'
import { ContinueButton, MicIcon, SkipButton } from './IntroControls'
import { LoudnessFill } from './loudnessFill'

const SKIP_FILL_S = 1.2
const LIVE_BUMP = 0.04
const MAX_STEP_S = 0.05
const PROMPT_FILL = 0.1

type Access = 'idle' | 'asking' | 'granted' | 'denied'

const ACCESS_LABELS: Record<Access, string> = {
  idle: 'Povolit',
  asking: 'Povolit',
  granted: 'Povoleno',
  denied: 'Nepovoleno',
}

export function MediaStep({ onContinue }: { onContinue: (camera: boolean) => void }) {
  const [access, setAccess] = useState<Access>('idle')
  const [camera, setCamera] = useState(false)
  const [meter, setMeter] = useState<LevelMeter | null>(null)
  const [skipping, setSkipping] = useState(false)
  const [filled, setFilled] = useState(false)
  const [promptHidden, setPromptHidden] = useState(false)
  const [loudness] = useState(() => new LoudnessFill())
  const levelRef = useRef<HTMLDivElement>(null)
  const skippingRef = useRef(false)
  const unmountedRef = useRef(false)

  useEffect(() => {
    unmountedRef.current = false
    return () => {
      unmountedRef.current = true
    }
  }, [])

  useEffect(() => {
    const level = levelRef.current
    if (!level) return

    let last = performance.now()
    let frame = 0
    const loop = (now: number) => {
      const dt = Math.min(MAX_STEP_S, Math.max(0, (now - last) / 1000))
      last = now
      if (skippingRef.current) {
        loudness.rate = 0
        loudness.fill = Math.min(1, loudness.fill + dt / SKIP_FILL_S)
      } else if (meter) {
        loudness.update(meter.readDecibels(), dt)
      }
      level.style.transform = `scaleY(${Math.min(1, loudness.fill + LIVE_BUMP * loudness.rate)})`
      if (loudness.fill >= PROMPT_FILL) setPromptHidden(true)
      if (loudness.fill >= 1) {
        meter?.close()
        setFilled(true)
        return
      }
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(frame)
      meter?.close()
    }
  }, [loudness, meter])

  const allow = () => {
    setAccess('asking')
    prepareMicrophoneContext()
    void requestMediaAccess().then((result) => {
      setCamera(result.camera)
      setAccess(result.microphone || result.camera ? 'granted' : 'denied')
      if (result.microphone && !skippingRef.current && !unmountedRef.current) {
        setMeter(createLevelMeter(result.microphone))
      } else {
        stopStream(result.microphone)
      }
    })
  }

  const skip = () => {
    skippingRef.current = true
    setSkipping(true)
  }

  return (
    <div className="intro-media">
      {meter && promptHidden && <MicIcon className="intro-media__mic" />}
      <div ref={levelRef} className="intro-media__level" />
      <div className={filled ? 'intro-overlay is-hidden' : 'intro-overlay'}>
        <div className={promptHidden ? 'intro-prompt is-hidden' : 'intro-prompt'}>
          <p className="intro-text">Některé úrovně vyžadují mikrofon nebo kameru.</p>
          <button type="button" className="intro-button" disabled={access !== 'idle' || skipping} onClick={allow}>
            {ACCESS_LABELS[access]}
          </button>
          <p className="intro-note">Nic se nenahrává ani neodesílá.</p>
        </div>
      </div>
      {!skipping && !filled && <SkipButton onClick={skip} />}
      {filled && (
        <div className="intro-finish">
          <ContinueButton onClick={() => onContinue(camera)} />
        </div>
      )}
    </div>
  )
}
