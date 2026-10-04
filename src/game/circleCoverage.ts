const PROGRESS_GRID = 32

export function centeredCircleCoverage(radius: number, width: number, height: number) {
  let inside = 0
  for (let i = 0; i < PROGRESS_GRID; i++) {
    for (let j = 0; j < PROGRESS_GRID; j++) {
      const x = (i / (PROGRESS_GRID - 1) - 0.5) * width
      const y = (j / (PROGRESS_GRID - 1) - 0.5) * height
      if (Math.hypot(x, y) <= radius) inside++
    }
  }
  return inside / PROGRESS_GRID ** 2
}
