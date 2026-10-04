import type { Point } from './render'

const CIRCLE_RADIUS = 0.17
const TOP_SPLIT_X = 0.77
const RIGHT_SPLIT_Y = 0.6
const SEGMENTS_PER_TURN = 64

export const PIECE_COUNT = 4

const STEP = (2 * Math.PI) / SEGMENTS_PER_TURN

function arcAngles(from: number, to: number) {
  const angles = [from]
  const direction = Math.sign(to - from)
  let k = direction > 0 ? Math.floor(from / STEP) + 1 : Math.ceil(from / STEP) - 1
  while ((k * STEP - to) * direction < 0) {
    angles.push(k * STEP)
    k += direction
  }
  angles.push(to)
  return angles
}

export function pieceOutlines(width: number, height: number): Point[][] {
  const center = { x: width / 2, y: height / 2 }
  const radius = CIRCLE_RADIUS * width
  const top = { x: TOP_SPLIT_X * width, y: 0 }
  const right = { x: width, y: RIGHT_SPLIT_Y * height }
  const corner = { x: 0, y: height }
  const angleTo = (p: Point) => Math.atan2(p.y - center.y, p.x - center.x)
  const topAngle = angleTo(top)
  const rightAngle = angleTo(right)
  const cornerAngle = angleTo(corner)
  const arc = (from: number, to: number) =>
    arcAngles(from, to).map((angle) => ({
      x: center.x + radius * Math.cos(angle),
      y: center.y + radius * Math.sin(angle),
    }))

  return [
    [
      ...arc(topAngle, rightAngle),
      ...arc(rightAngle, cornerAngle).slice(1),
      ...arc(cornerAngle, topAngle + 2 * Math.PI).slice(1, -1),
    ],
    [top, { x: width, y: 0 }, right, ...arc(rightAngle, topAngle)],
    [right, { x: width, y: height }, corner, ...arc(cornerAngle, rightAngle)],
    [corner, { x: 0, y: 0 }, top, ...arc(topAngle + 2 * Math.PI, cornerAngle)],
  ]
}

export function polygonArea(points: Point[]) {
  let twice = 0
  points.forEach((a, i) => {
    const b = points[(i + 1) % points.length]
    twice += a.x * b.y - b.x * a.y
  })
  return Math.abs(twice) / 2
}
