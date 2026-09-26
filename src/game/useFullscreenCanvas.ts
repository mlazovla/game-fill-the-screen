import { useLayoutEffect, useRef } from 'react'

function cloneCanvas(source: HTMLCanvasElement) {
  const copy = document.createElement('canvas')
  copy.width = source.width
  copy.height = source.height
  copy.getContext('2d')?.drawImage(source, 0, 0)
  return copy
}

export function useFullscreenCanvas(background: string) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useLayoutEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    let initialized = false
    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const width = Math.max(1, Math.round(canvas.clientWidth * dpr))
      const height = Math.max(1, Math.round(canvas.clientHeight * dpr))
      if (initialized && width === canvas.width && height === canvas.height) return

      const snapshot = initialized ? cloneCanvas(canvas) : null
      canvas.width = width
      canvas.height = height
      ctx.fillStyle = background
      ctx.fillRect(0, 0, width, height)
      if (snapshot) ctx.drawImage(snapshot, 0, 0, width, height)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      initialized = true
    }

    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [background])

  return canvasRef
}
