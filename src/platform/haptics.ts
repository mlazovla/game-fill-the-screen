export function vibrate(durationMs: number) {
  if ('vibrate' in navigator) navigator.vibrate(durationMs)
}
