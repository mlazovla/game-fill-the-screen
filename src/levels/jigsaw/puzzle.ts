export const COLUMNS = 2
export const ROWS = 3

const KNOB = 0.26
const NECK = 0.34
const HEAD = 0.5
const NECK_LENGTH = 0.14
const FILLET = 0.14
const ARC_STEPS = 20
const FILLET_STEPS = 6

export interface Point {
  x: number
  y: number
}

export interface Tabs {
  vertical: number[]
  horizontal: number[]
}

const randomSide = () => (Math.random() < 0.5 ? -1 : 1)

export function randomTabs(): Tabs {
  return {
    vertical: Array.from({ length: ROWS * (COLUMNS - 1) }, randomSide),
    horizontal: Array.from({ length: (ROWS - 1) * COLUMNS }, randomSide),
  }
}

function edge(from: Point, to: Point, direction: number, knob: number): Point[] {
  if (!direction) return [from]
  const length = Math.hypot(to.x - from.x, to.y - from.y)
  const along = { x: (to.x - from.x) / length, y: (to.y - from.y) / length }
  const out = { x: along.y * direction, y: -along.x * direction }
  const at = (u: number, v: number) => ({ x: from.x + along.x * u + out.x * v, y: from.y + along.y * u + out.y * v })

  const middle = length / 2
  const neck = knob * NECK
  const head = knob * HEAD
  const neckLength = knob * NECK_LENGTH
  const fillet = knob * FILLET
  const shoulder = (side: number) =>
    Array.from({ length: FILLET_STEPS + 1 }, (_, i) => {
      const t = i / FILLET_STEPS
      const u = 1 - t
      const x = u * u * (middle + side * (neck + fillet)) + 2 * u * t * (middle + side * neck) + t * t * (middle + side * neck)
      return at(x, t * t * neckLength)
    })
  const centerV = neckLength + Math.sqrt(head * head - neck * neck)
  const start = Math.atan2(neckLength - centerV, -neck)
  const end = Math.atan2(neckLength - centerV, neck) - Math.PI * 2
  const arc = Array.from({ length: ARC_STEPS + 1 }, (_, i) => {
    const angle = start + ((end - start) * i) / ARC_STEPS
    return at(middle + head * Math.cos(angle), centerV + head * Math.sin(angle))
  })
  return [from, ...shoulder(-1), ...arc, ...shoulder(1).reverse()]
}

export function pieceOutline(column: number, row: number, width: number, height: number, tabs: Tabs): Point[] {
  const knob = Math.min(width, height) * KNOB
  const top = row === 0 ? 0 : -tabs.horizontal[(row - 1) * COLUMNS + column]
  const bottom = row === ROWS - 1 ? 0 : tabs.horizontal[row * COLUMNS + column]
  const left = column === 0 ? 0 : -tabs.vertical[row * (COLUMNS - 1) + column - 1]
  const right = column === COLUMNS - 1 ? 0 : tabs.vertical[row * (COLUMNS - 1) + column]
  const corners = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height },
  ]
  return [
    ...edge(corners[0], corners[1], top, knob),
    ...edge(corners[1], corners[2], right, knob),
    ...edge(corners[2], corners[3], bottom, knob),
    ...edge(corners[3], corners[0], left, knob),
  ]
}
