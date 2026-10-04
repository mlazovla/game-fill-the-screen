import type { DeviceAngles } from '../../platform/deviceRotation'

export type Vec3 = [number, number, number]

export interface View {
  right: Vec3
  up: Vec3
  forward: Vec3
}

export interface Euler {
  yaw: number
  pitch: number
  roll: number
}

const DEG = Math.PI / 180

export const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

const combine = (a: Vec3, ka: number, b: Vec3, kb: number, c: Vec3 = [0, 0, 0], kc = 0): Vec3 => [
  a[0] * ka + b[0] * kb + c[0] * kc,
  a[1] * ka + b[1] * kb + c[1] * kc,
  a[2] * ka + b[2] * kb + c[2] * kc,
]

const rotX = ([x, y, z]: Vec3, a: number): Vec3 => [x, y * Math.cos(a) - z * Math.sin(a), y * Math.sin(a) + z * Math.cos(a)]
const rotY = ([x, y, z]: Vec3, a: number): Vec3 => [x * Math.cos(a) + z * Math.sin(a), y, -x * Math.sin(a) + z * Math.cos(a)]
const rotZ = ([x, y, z]: Vec3, a: number): Vec3 => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a), z]

function orient(transform: (v: Vec3) => Vec3): View {
  const [x, y, z] = transform([0, 0, 1])
  return { right: transform([1, 0, 0]), up: transform([0, 1, 0]), forward: [-x, -y, -z] }
}

export const deviceView = ({ alpha, beta, gamma }: DeviceAngles) =>
  orient((v) => rotZ(rotX(rotY(v, gamma * DEG), beta * DEG), alpha * DEG))

export const eulerView = ({ yaw, pitch, roll }: Euler) =>
  orient((v) => rotZ(rotX(rotZ(v, roll), Math.PI / 2 + pitch), yaw))

export function turnRight(view: View, angle: number): View {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return {
    right: combine(view.right, cos, view.forward, -sin),
    up: view.up,
    forward: combine(view.forward, cos, view.right, sin),
  }
}

export const toCamera = (view: View, p: Vec3): Vec3 => [dot(p, view.right), dot(p, view.up), dot(p, view.forward)]

export const fromCamera = (view: View, [x, y, z]: Vec3): Vec3 => combine(view.right, x, view.up, y, view.forward, z)

export const angleBetween = (a: Vec3, b: Vec3) => Math.acos(Math.min(1, Math.max(-1, dot(a, b))))

export function sphereDots(spacingDeg: number): Vec3[] {
  const dots: Vec3[] = []
  for (let lat = -90; lat <= 90; lat += spacingDeg) {
    const ring = Math.cos(lat * DEG)
    const count = Math.max(1, Math.round((360 * ring) / spacingDeg))
    for (let i = 0; i < count; i++) {
      const lon = ((i + (lat / spacingDeg) * 0.5) / count) * 2 * Math.PI
      dots.push([ring * Math.cos(lon), ring * Math.sin(lon), Math.sin(lat * DEG)])
    }
  }
  return dots
}

export function rollAround(view: View, angle: number): View {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return {
    right: combine(view.right, cos, view.up, sin),
    up: combine(view.up, cos, view.right, -sin),
    forward: view.forward,
  }
}

export const rollBetween = (view: View, target: View) => Math.atan2(dot(target.up, view.right), dot(target.up, view.up))
