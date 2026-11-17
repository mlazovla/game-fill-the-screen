import { useEffect, useEffectEvent, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { LevelProps } from '../../game/types'
import { PexesoSymbol } from '../pexeso-common/PexesoSymbol'
import { CARD_COUNT, dealCards, updateCard, type Axis, type Card, type OpenFace } from './deck'
import '../pexeso-common/pexeso.css'
import './Pexeso2Level.css'

const AXIS_LOCK_PX = 10
const FLIP_TRAVEL = 0.9
const COMPLETE_ANGLE = 90
const FLICK_SPEED = 600
const FLICK_MIN_ANGLE = 25
const VELOCITY_WINDOW_MS = 100
const FLIP_MS = 260
const CLOSE_MS = 320
const MATCH_DELAY_MS = 600
const MISMATCH_DELAY_MS = 1000
const VANISH_MS = 350

interface Drag {
  index: number
  startX: number
  startY: number
  travel: number
  axis: Axis | null
  dead: boolean
  angle: number
  samples: { time: number; offset: number }[]
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

function Arrow({ angle }: { angle: number }) {
  return (
    <g transform={`rotate(${angle})`}>
      <rect x="9" y="-3" width="24" height="6" rx="1" />
      <polygon points="45,0 31,-11 31,11" />
    </g>
  )
}

function Arrows({ card, lit }: { card: Card; lit: Axis | undefined }) {
  const axisClass = (axis: Axis) =>
    `pexeso-2__axis${card.solved[axis] ? ' pexeso-2__axis--solved' : ''}${lit === axis ? ' pexeso-2__axis--lit' : ''}`
  return (
    <svg className="pexeso-2__arrows" viewBox="-50 -50 100 100" aria-hidden="true">
      <g className={axisClass('h')}>
        <Arrow angle={0} />
        <Arrow angle={180} />
      </g>
      <g className={axisClass('v')}>
        <Arrow angle={-90} />
        <Arrow angle={90} />
      </g>
    </svg>
  )
}

export default function Pexeso2Level({ onProgress, onComplete }: LevelProps) {
  const [cards, setCards] = useState(dealCards)
  const [active, setActive] = useState<Partial<Record<number, Axis>>>({})
  const cardsRef = useRef(cards)
  const innerRefs = useRef<(HTMLDivElement | null)[]>([])
  const dragsRef = useRef(new Map<number, Drag>())
  const openRef = useRef<OpenFace[]>([])
  const mismatchTimerRef = useRef(0)
  const timersRef = useRef(new Set<number>())

  const reportFill = useEffectEvent((ratio: number) => onProgress(ratio))
  const complete = useEffectEvent(() => onComplete())

  useEffect(() => {
    const timers = timersRef.current
    return () => {
      for (const id of timers) window.clearTimeout(id)
    }
  }, [])

  const goneCount = cards.filter((card) => card.gone).length

  useEffect(() => {
    reportFill(goneCount / CARD_COUNT)
    if (goneCount < CARD_COUNT) return
    const id = window.setTimeout(() => complete(), VANISH_MS)
    return () => window.clearTimeout(id)
  }, [goneCount])

  const update = (next: Card[]) => {
    cardsRef.current = next
    setCards(next)
  }

  const schedule = (callback: () => void, delay: number) => {
    const id = window.setTimeout(() => {
      timersRef.current.delete(id)
      callback()
    }, delay)
    timersRef.current.add(id)
    return id
  }

  const setActiveAxis = (index: number, axis: Axis | undefined) =>
    setActive((current) => ({ ...current, [index]: axis }))

  const rotate = (index: number, axis: Axis, angle: number, durationMs: number) => {
    const inner = innerRefs.current[index]
    if (!inner) return
    inner.style.transition = durationMs > 0 ? `transform ${durationMs}ms ease-out` : 'none'
    inner.style.transform = axis === 'h' ? `rotateY(${angle}deg)` : `rotateX(${-angle}deg)`
  }

  const closeFaces = (faces: OpenFace[]) => {
    let next = cardsRef.current
    for (const face of faces) {
      next = updateCard(next, face.index, () => ({ open: false }))
      rotate(face.index, face.axis, 0, CLOSE_MS)
    }
    update(next)
  }

  const closeMismatch = () => {
    if (openRef.current.length < 2) return
    window.clearTimeout(mismatchTimerRef.current)
    timersRef.current.delete(mismatchTimerRef.current)
    closeFaces(openRef.current)
    openRef.current = []
  }

  const resolveMatch = (pair: OpenFace[]) => {
    let next = cardsRef.current
    for (const face of pair) {
      next = updateCard(next, face.index, (card) => {
        const solved = { ...card.solved, [face.axis]: true }
        return { solved, open: false, gone: solved.h && solved.v }
      })
    }
    update(next)
    for (const face of pair) {
      if (!next[face.index].gone) rotate(face.index, face.axis, 0, CLOSE_MS)
    }
  }

  const reveal = (index: number, axis: Axis) => {
    closeMismatch()
    update(updateCard(cardsRef.current, index, () => ({ open: true })))
    const open = [...openRef.current, { index, axis }]
    openRef.current = open
    if (open.length < 2) return

    const [a, b] = open
    const cards = cardsRef.current
    if (cards[a.index].faces[a.axis] === cards[b.index].faces[b.axis]) {
      openRef.current = []
      schedule(() => resolveMatch(open), MATCH_DELAY_MS)
    } else {
      mismatchTimerRef.current = schedule(() => {
        openRef.current = []
        closeFaces(open)
      }, MISMATCH_DELAY_MS)
    }
  }

  const onPointerDown = (index: number, event: ReactPointerEvent<HTMLDivElement>) => {
    const card = cardsRef.current[index]
    if (card.gone || card.open) return
    if ([...dragsRef.current.values()].some((drag) => drag.index === index)) return
    closeMismatch()
    event.currentTarget.setPointerCapture(event.pointerId)
    const rect = event.currentTarget.getBoundingClientRect()
    dragsRef.current.set(event.pointerId, {
      index,
      startX: event.clientX,
      startY: event.clientY,
      travel: Math.min(rect.width, rect.height) * FLIP_TRAVEL,
      axis: null,
      dead: false,
      angle: 0,
      samples: [],
    })
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragsRef.current.get(event.pointerId)
    if (!drag || drag.dead) return
    const dx = event.clientX - drag.startX
    const dy = event.clientY - drag.startY

    if (!drag.axis) {
      if (Math.hypot(dx, dy) < AXIS_LOCK_PX) return
      const axis: Axis = Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v'
      if (cardsRef.current[drag.index].solved[axis]) {
        drag.dead = true
        return
      }
      drag.axis = axis
      update(updateCard(cardsRef.current, drag.index, () => ({ shown: axis })))
      setActiveAxis(drag.index, axis)
    }

    const offset = drag.axis === 'h' ? dx : dy
    drag.angle = clamp((offset / drag.travel) * 180, -180, 180)
    drag.samples.push({ time: event.timeStamp, offset })
    drag.samples = drag.samples.filter((sample) => event.timeStamp - sample.time <= VELOCITY_WINDOW_MS)
    rotate(drag.index, drag.axis, drag.angle, 0)
  }

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const drag = dragsRef.current.get(event.pointerId)
    if (!drag) return
    dragsRef.current.delete(event.pointerId)
    if (!drag.axis || drag.dead) return
    setActiveAxis(drag.index, undefined)

    const first = drag.samples[0]
    const last = drag.samples[drag.samples.length - 1]
    const span = first && last ? (last.time - first.time) / 1000 : 0
    const speed = span > 0 ? (last.offset - first.offset) / span : 0
    const flicked =
      Math.abs(speed) >= FLICK_SPEED && Math.sign(speed) === Math.sign(drag.angle) && Math.abs(drag.angle) >= FLICK_MIN_ANGLE

    if (!cancelled && (Math.abs(drag.angle) >= COMPLETE_ANGLE || flicked)) {
      rotate(drag.index, drag.axis, Math.sign(drag.angle) * 180, FLIP_MS)
      reveal(drag.index, drag.axis)
    } else {
      rotate(drag.index, drag.axis, 0, CLOSE_MS)
    }
  }

  return (
    <div className="pexeso pexeso-2">
      {cards.map((card, i) => (
        <div
          key={i}
          className={`pexeso__card${card.gone ? ' pexeso__card--gone' : ''}${active[i] ? ' pexeso-2__card--active' : ''}`}
          onPointerDown={(event) => onPointerDown(i, event)}
          onPointerMove={onPointerMove}
          onPointerUp={(event) => endDrag(event, false)}
          onPointerCancel={(event) => endDrag(event, true)}
        >
          <div
            ref={(element) => {
              innerRefs.current[i] = element
            }}
            className="pexeso__inner"
          >
            <div className="pexeso__side">
              <Arrows card={card} lit={active[i]} />
            </div>
            <div className={`pexeso__side pexeso-2__front pexeso-2__front--${card.shown}`}>
              <PexesoSymbol name={card.faces[card.shown]} className="pexeso__symbol" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
