const COLOR_TOLERANCE = 24

function parseHexColor(hex: string): [number, number, number] {
  const value = hex.replace('#', '')
  const full = value.length === 3 ? [...value].map((c) => c + c).join('') : value
  const n = Number.parseInt(full, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function createFillMeter(startColor: string, sampleWidth = 96) {
  const [r, g, b] = parseHexColor(startColor)
  const sample = document.createElement('canvas')
  const ctx = sample.getContext('2d', { willReadFrequently: true })!

  return function measureFill(source: HTMLCanvasElement): number {
    const width = sampleWidth
    const height = Math.max(1, Math.round((sampleWidth * source.height) / source.width))
    if (sample.width !== width || sample.height !== height) {
      sample.width = width
      sample.height = height
    }
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(source, 0, 0, width, height)

    const pixels = ctx.getImageData(0, 0, width, height).data
    let untouched = 0
    for (let i = 0; i < pixels.length; i += 4) {
      if (
        Math.abs(pixels[i] - r) <= COLOR_TOLERANCE &&
        Math.abs(pixels[i + 1] - g) <= COLOR_TOLERANCE &&
        Math.abs(pixels[i + 2] - b) <= COLOR_TOLERANCE
      ) {
        untouched++
      }
    }
    return 1 - untouched / (width * height)
  }
}
