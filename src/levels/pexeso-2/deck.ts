import { BASIC_SYMBOLS, EXTRA_SYMBOLS, shuffle, type SymbolName } from '../pexeso-common/symbols'

export type Axis = 'h' | 'v'

export interface Card {
  faces: Record<Axis, SymbolName>
  solved: Record<Axis, boolean>
  shown: Axis
  open: boolean
  gone: boolean
}

export interface OpenFace {
  index: number
  axis: Axis
}

const SYMBOLS = [...BASIC_SYMBOLS, ...EXTRA_SYMBOLS]
export const CARD_COUNT = SYMBOLS.length

export function dealCards(): Card[] {
  for (;;) {
    const faces = shuffle([...SYMBOLS, ...SYMBOLS])
    const cards = Array.from({ length: CARD_COUNT }, (_, i) => ({
      faces: { h: faces[2 * i], v: faces[2 * i + 1] },
      solved: { h: false, v: false },
      shown: 'h' as Axis,
      open: false,
      gone: false,
    }))
    if (cards.every((card) => card.faces.h !== card.faces.v)) return cards
  }
}

export const updateCard = (cards: Card[], index: number, change: (card: Card) => Partial<Card>) =>
  cards.map((card, i) => (i === index ? { ...card, ...change(card) } : card))
