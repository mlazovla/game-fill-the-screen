import { useEffect, useEffectEvent, useRef, useState } from 'react'
import type { LevelProps } from '../../game/types'
import { dealCards, setFaces, type Card } from './deck'
import { PexesoSymbol } from '../pexeso-common/PexesoSymbol'
import '../pexeso-common/pexeso.css'
import './Pexeso1Level.css'

const MATCH_DELAY_MS = 500
const MISMATCH_DELAY_MS = 1000
const VANISH_MS = 350

export default function Pexeso1Level({ onProgress, onComplete }: LevelProps) {
  const [cards, setCards] = useState(dealCards)
  const cardsRef = useRef(cards)
  const openRef = useRef<number[]>([])
  const mismatchTimerRef = useRef(0)
  const timersRef = useRef(new Set<number>())

  const reportFill = useEffectEvent((ratio: number) => onProgress(ratio))
  const complete = useEffectEvent(() => onComplete())

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

  useEffect(() => {
    const timers = timersRef.current
    return () => {
      for (const id of timers) window.clearTimeout(id)
    }
  }, [])

  const goneCount = cards.filter((card) => card.face === 'gone').length

  useEffect(() => {
    reportFill(goneCount / cards.length)
    if (goneCount < cards.length) return
    const id = window.setTimeout(() => complete(), VANISH_MS)
    return () => window.clearTimeout(id)
  }, [goneCount, cards.length])

  const flip = (index: number) => {
    let next = cardsRef.current
    if (next[index].face !== 'down') return
    let open = openRef.current

    if (open.length === 2) {
      window.clearTimeout(mismatchTimerRef.current)
      timersRef.current.delete(mismatchTimerRef.current)
      next = setFaces(next, open, 'down')
      open = []
    }

    next = setFaces(next, [index], 'up')
    open = [...open, index]

    if (open.length === 2) {
      const pair = open
      if (next[pair[0]].symbol === next[pair[1]].symbol) {
        open = []
        schedule(() => update(setFaces(cardsRef.current, pair, 'gone')), MATCH_DELAY_MS)
      } else {
        mismatchTimerRef.current = schedule(() => {
          openRef.current = []
          update(setFaces(cardsRef.current, pair, 'down'))
        }, MISMATCH_DELAY_MS)
      }
    }

    openRef.current = open
    update(next)
  }

  return (
    <div className="pexeso pexeso-1">
      {cards.map((card, i) => (
        <div key={i} className={`pexeso__card pexeso__card--${card.face}`}>
          <div className="pexeso__inner">
            <div className="pexeso__side">
              <button
                type="button"
                className="pexeso-1__dot"
                aria-label="Otočit kartu"
                onPointerDown={() => flip(i)}
              />
            </div>
            <div className="pexeso__side pexeso-1__front">
              <PexesoSymbol name={card.symbol} className="pexeso__symbol" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
