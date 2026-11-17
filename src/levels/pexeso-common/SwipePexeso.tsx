import { useEffect, useEffectEvent, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { LevelProps } from '../../game/types'
import { PexesoSymbol } from './PexesoSymbol'
import type { SymbolName } from './symbols'
import './pexeso.css'
import './SwipePexeso.css'

export interface Direction {
  x: number
  y: number
}

export interface SwipePexesoConfig {
  className: string
  columns: number
  rows: number
  directions: Direction[]
  faceOf: (direction: number) => number
  lockPx: number
  deal: () => SymbolName[][]
}

interface Card {
  faces: SymbolName[]
  solved: boolean[]
  shown: number
  open: boolean
  gone: boolean
}

interface OpenFace {
  index: number
  face: number
  direction: number
}

interface Drag {
  index: number
  startX: number
  startY: number
  travel: number
  direction: number | null
  dead: boolean
  angle: number
  samples: { time: number; offset: number }[]
}

const FLIP_TRAVEL = 0.9
const MAX_TRAVEL_PX = 160
const COMPLETE_ANGLE = 90
const FLICK_SPEED = 600
const FLICK_MIN_ANGLE = 25
const VELOCITY_WINDOW_MS = 100
const FLIP_MS = 260
const CLOSE_MS = 320
const MATCH_DELAY_MS = 600
const MISMATCH_DELAY_MS = 1000
const VANISH_MS = 350

const flipTransform = (direction: Direction, angle: number) =>
  `rotate3d(${-direction.y}, ${direction.x}, 0, ${angle}deg)`

const updateCard = (cards: Card[], index: number, change: (card: Card) => Partial<Card>) =>
  cards.map((card, i) => (i === index ? { ...card, ...change(card) } : card))

const dealCards = (config: SwipePexesoConfig): Card[] =>
  config.deal().map((faces) => ({
    faces,
    solved: faces.map(() => false),
    shown: 0,
    open: false,
    gone: false,
  }))

function Arrows({ config, card, litFace }: { config: SwipePexesoConfig; card: Card; litFace: number | undefined }) {
  return (
    <svg className="swipe-pexeso__arrows" viewBox="-50 -50 100 100" aria-hidden="true">
      {config.directions.map((direction, i) => {
        const face = config.faceOf(i)
        const className = `swipe-pexeso__arrow${card.solved[face] ? ' swipe-pexeso__arrow--solved' : ''}${
          litFace === face ? ' swipe-pexeso__arrow--lit' : ''
        }`
        return (
          <g key={i} className={className} transform={`rotate(${(Math.atan2(direction.y, direction.x) * 180) / Math.PI})`}>
            <rect x="9" y="-3" width="24" height="6" rx="1" />
            <polygon points="45,0 31,-11 31,11" />
          </g>
        )
      })}
    </svg>
  )
}

export function SwipePexeso({ config, onProgress, onComplete }: LevelProps & { config: SwipePexesoConfig }) {
  const [cards, setCards] = useState(() => dealCards(config))
  const [active, setActive] = useState<Partial<Record<number, number>>>({})
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
    reportFill(goneCount / cards.length)
    if (goneCount < cards.length) return
    const id = window.setTimeout(() => complete(), VANISH_MS)
    return () => window.clearTimeout(id)
  }, [goneCount, cards.length])

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

  const setActiveDirection = (index: number, direction: number | undefined) =>
    setActive((current) => ({ ...current, [index]: direction }))

  const rotate = (index: number, direction: number, angle: number, durationMs: number) => {
    const inner = innerRefs.current[index]
    if (!inner) return
    inner.style.transition = durationMs > 0 ? `transform ${durationMs}ms ease-out` : 'none'
    inner.style.transform = flipTransform(config.directions[direction], angle)
  }

  const closeFaces = (faces: OpenFace[]) => {
    let next = cardsRef.current
    for (const face of faces) {
      next = updateCard(next, face.index, () => ({ open: false }))
      rotate(face.index, face.direction, 0, CLOSE_MS)
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
    for (const open of pair) {
      next = updateCard(next, open.index, (card) => {
        const solved = card.solved.map((done, face) => done || face === open.face)
        return { solved, open: false, gone: solved.every(Boolean) }
      })
    }
    update(next)
    for (const open of pair) {
      if (!next[open.index].gone) rotate(open.index, open.direction, 0, CLOSE_MS)
    }
  }

  const reveal = (index: number, direction: number) => {
    closeMismatch()
    update(updateCard(cardsRef.current, index, () => ({ open: true })))
    const open = [...openRef.current, { index, face: config.faceOf(direction), direction }]
    openRef.current = open
    if (open.length < 2) return

    const [a, b] = open
    const cards = cardsRef.current
    if (cards[a.index].faces[a.face] === cards[b.index].faces[b.face]) {
      openRef.current = []
      schedule(() => resolveMatch(open), MATCH_DELAY_MS)
    } else {
      mismatchTimerRef.current = schedule(() => {
        openRef.current = []
        closeFaces(open)
      }, MISMATCH_DELAY_MS)
    }
  }

  const nearestDirection = (dx: number, dy: number) => {
    let best = 0
    let bestDot = -Infinity
    config.directions.forEach((direction, i) => {
      const dot = dx * direction.x + dy * direction.y
      if (dot > bestDot) {
        bestDot = dot
        best = i
      }
    })
    return best
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
      travel: Math.min(MAX_TRAVEL_PX, Math.min(rect.width, rect.height) * FLIP_TRAVEL),
      direction: null,
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

    if (drag.direction === null) {
      if (Math.hypot(dx, dy) < config.lockPx) return
      const direction = nearestDirection(dx, dy)
      if (cardsRef.current[drag.index].solved[config.faceOf(direction)]) {
        drag.dead = true
        return
      }
      drag.direction = direction
      update(updateCard(cardsRef.current, drag.index, () => ({ shown: direction })))
      setActiveDirection(drag.index, direction)
    }

    const { x, y } = config.directions[drag.direction]
    const offset = dx * x + dy * y
    drag.angle = Math.min(180, Math.max(0, (offset / drag.travel) * 180))
    drag.samples.push({ time: event.timeStamp, offset })
    drag.samples = drag.samples.filter((sample) => event.timeStamp - sample.time <= VELOCITY_WINDOW_MS)
    rotate(drag.index, drag.direction, drag.angle, 0)
  }

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const drag = dragsRef.current.get(event.pointerId)
    if (!drag) return
    dragsRef.current.delete(event.pointerId)
    if (drag.direction === null || drag.dead) return
    setActiveDirection(drag.index, undefined)

    const first = drag.samples[0]
    const last = drag.samples[drag.samples.length - 1]
    const span = first && last ? (last.time - first.time) / 1000 : 0
    const speed = span > 0 ? (last.offset - first.offset) / span : 0
    const flicked = speed >= FLICK_SPEED && drag.angle >= FLICK_MIN_ANGLE

    if (!cancelled && (drag.angle >= COMPLETE_ANGLE || flicked)) {
      rotate(drag.index, drag.direction, 180, FLIP_MS)
      reveal(drag.index, drag.direction)
    } else {
      rotate(drag.index, drag.direction, 0, CLOSE_MS)
    }
  }

  return (
    <div
      className={`pexeso swipe-pexeso ${config.className}`}
      style={{
        gridTemplateColumns: `repeat(${config.columns}, 1fr)`,
        gridTemplateRows: `repeat(${config.rows}, 1fr)`,
      }}
    >
      {cards.map((card, i) => {
        const activeDirection = active[i]
        return (
          <div
            key={i}
            className={`pexeso__card${card.gone ? ' pexeso__card--gone' : ''}${
              activeDirection !== undefined ? ' swipe-pexeso__card--active' : ''
            }`}
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
              <div className="pexeso__side pexeso__back">
                <Arrows
                  config={config}
                  card={card}
                  litFace={activeDirection === undefined ? undefined : config.faceOf(activeDirection)}
                />
              </div>
              <div
                className="pexeso__side"
                style={{ transform: flipTransform(config.directions[card.shown], 180) }}
              >
                <PexesoSymbol name={card.faces[config.faceOf(card.shown)]} className="pexeso__symbol" />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
