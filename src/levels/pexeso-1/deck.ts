import { BASIC_SYMBOLS, shuffle, type SymbolName } from '../pexeso-common/symbols'

export type Face = 'down' | 'up' | 'gone'

export interface Card {
  symbol: SymbolName
  face: Face
}

export const dealCards = (): Card[] =>
  shuffle([...BASIC_SYMBOLS, ...BASIC_SYMBOLS]).map((symbol) => ({ symbol, face: 'down' }))

export const setFaces = (cards: Card[], indices: number[], face: Face) =>
  cards.map((card, i) => (indices.includes(i) ? { ...card, face } : card))
