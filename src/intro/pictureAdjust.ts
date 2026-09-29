export type AdjustmentKey = 'brightness' | 'contrast' | 'gamma'

export type Adjustments = Record<AdjustmentKey, number>

export interface Transfer {
  amplitude: number
  exponent: number
  offset: number
}

export interface Crop {
  x: number
  y: number
  width: number
  height: number
}

export const ADJUSTMENT_LABELS: [AdjustmentKey, string][] = [
  ['contrast', 'Kontrast'],
  ['gamma', 'Gama'],
  ['brightness', 'Jas'],
]

export const INITIAL_ADJUSTMENTS: Adjustments = { brightness: -20, contrast: 0, gamma: -10 }

export const ADJUSTMENT_LIMIT = 100

const SAMPLE_SIZE = 32

export function transferOf(adjustments: Adjustments): Transfer {
  const contrast = 2 ** (adjustments.contrast / 50)
  return {
    amplitude: contrast,
    exponent: 2 ** (-adjustments.gamma / 50),
    offset: 0.5 * (1 - contrast) + adjustments.brightness / 100,
  }
}

export function coverCrop(sourceWidth: number, sourceHeight: number, targetWidth: number, targetHeight: number): Crop {
  const sourceAspect = sourceWidth / sourceHeight
  const targetAspect = targetWidth / targetHeight
  const width = sourceAspect > targetAspect ? targetAspect / sourceAspect : 1
  const height = sourceAspect > targetAspect ? 1 : sourceAspect / targetAspect
  return { x: (1 - width) / 2, y: (1 - height) / 2, width, height }
}

export function createBrightnessMeter() {
  const sample = document.createElement('canvas')
  sample.width = SAMPLE_SIZE
  sample.height = SAMPLE_SIZE
  const ctx = sample.getContext('2d', { willReadFrequently: true })!

  return function averageBrightness(source: CanvasImageSource, sourceWidth: number, sourceHeight: number, crop: Crop, transfer: Transfer) {
    ctx.drawImage(
      source,
      crop.x * sourceWidth,
      crop.y * sourceHeight,
      crop.width * sourceWidth,
      crop.height * sourceHeight,
      0,
      0,
      SAMPLE_SIZE,
      SAMPLE_SIZE,
    )
    const pixels = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data
    let sum = 0
    for (let i = 0; i < pixels.length; i += 4) {
      const luma = (0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2]) / 255
      sum += Math.min(1, Math.max(0, transfer.amplitude * luma ** transfer.exponent + transfer.offset))
    }
    return sum / (SAMPLE_SIZE * SAMPLE_SIZE)
  }
}
