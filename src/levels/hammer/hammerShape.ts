const HANDLE = new Path2D('M41 44 Q 39 110 37 156 Q 37 163 43 163 L 58 163 Q 64 163 64 156 Q 62 110 60 44 Z')
const HEAD = new Path2D('M2 8 L 74 1 L 98 21 L 97 25 L 76 38 L 10 45 Z')
const HANDLE_COLOR = '#2b2b2b'
const HEAD_COLOR = '#3a3a3a'
const DESIGN_WIDTH = 100
const DESIGN_HEIGHT = 165
const MAX_WIDTH = 0.82
const MAX_HEIGHT = 0.7
const TOP = 0.07

export function drawHammer(ctx: CanvasRenderingContext2D, width: number, height: number, mirror: number) {
  const scale = Math.min((width * MAX_WIDTH) / DESIGN_WIDTH, (height * MAX_HEIGHT) / DESIGN_HEIGHT)
  ctx.save()
  ctx.translate(width / 2, height * TOP)
  ctx.scale(scale * mirror, scale)
  ctx.translate(-DESIGN_WIDTH / 2, 0)
  ctx.fillStyle = HANDLE_COLOR
  ctx.fill(HANDLE)
  ctx.fillStyle = HEAD_COLOR
  ctx.fill(HEAD)
  ctx.restore()
}
