export const BASIC_SYMBOLS = ['circle', 'star', 'cross', 'triangle', 'tree', 'clover'] as const
export const EXTRA_SYMBOLS = ['sun', 'flower', 'elephant', 'moon', 'hexagon', 'bolt'] as const

export type SymbolName = (typeof BASIC_SYMBOLS)[number] | (typeof EXTRA_SYMBOLS)[number]

export function shuffle<T>(items: T[]) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[items[i], items[j]] = [items[j], items[i]]
  }
  return items
}
