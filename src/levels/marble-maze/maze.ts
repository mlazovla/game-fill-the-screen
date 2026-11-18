export interface Vec {
  x: number
  y: number
}

export interface Arc {
  radius: number
  start: number
  end: number
}

export interface Segment {
  a: Vec
  b: Vec
}

export const BALL_RADIUS = 1
export const WALL = 0.5
export const RING_RADII = [4.5, 7.5, 10.5, 13.5, 16.5]
export const CORRIDORS = RING_RADII.length

const GAP_WIDTH = 3.1
const GAPS: number[][] = [[100], [280], [40, 90, 170], [0, 250], []]
const SPOKES: number[][] = [[320], [130, 340], [60, 200, 300], []]
const CUP = { radius: 1.4, from: 10, to: 190 }
const SEGMENT_LENGTH = 0.4
const DEG = Math.PI / 180
const TAU = Math.PI * 2

export function polar(radius: number, degrees: number): Vec {
  return { x: radius * Math.sin(degrees * DEG), y: -radius * Math.cos(degrees * DEG) }
}

export const START: Vec = polar(15, 180)

const canvasAngle = (degrees: number) => (degrees - 90) * DEG

function ringArcs(radius: number, gaps: number[]): Arc[] {
  if (gaps.length === 0) return [{ radius, start: 0, end: TAU }]
  const half = Math.asin(GAP_WIDTH / 2 / radius)
  const sorted = gaps.map(canvasAngle).sort((p, q) => p - q)
  return sorted.map((gap, i) => {
    const next = i + 1 < sorted.length ? sorted[i + 1] : sorted[0] + TAU
    return { radius, start: gap + half, end: next - half }
  })
}

export const ARCS: Arc[] = [
  ...RING_RADII.flatMap((radius, i) => ringArcs(radius, GAPS[i])),
  { radius: CUP.radius, start: canvasAngle(CUP.from), end: canvasAngle(CUP.to) },
]

export const SPOKE_SEGMENTS: Segment[] = SPOKES.flatMap((angles, i) =>
  angles.map((angle) => ({ a: polar(RING_RADII[i], angle), b: polar(RING_RADII[i + 1], angle) })),
)

function arcSegments({ radius, start, end }: Arc): Segment[] {
  const steps = Math.max(1, Math.ceil(((end - start) * radius) / SEGMENT_LENGTH))
  const point = (t: number) => {
    const angle = start + ((end - start) * t) / steps
    return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) }
  }
  return Array.from({ length: steps }, (_, i) => ({ a: point(i), b: point(i + 1) }))
}

export const COLLIDERS: Segment[] = [...ARCS.flatMap(arcSegments), ...SPOKE_SEGMENTS]

export function corridorAt(distance: number, previous: number) {
  const clearance = BALL_RADIUS + WALL / 2
  if (RING_RADII.some((radius) => Math.abs(distance - radius) < clearance)) return previous
  return RING_RADII.filter((radius) => radius < distance).length
}
