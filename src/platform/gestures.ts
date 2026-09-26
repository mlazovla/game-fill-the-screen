export function blockBrowserGestures() {
  const prevent = (event: Event) => event.preventDefault()
  document.addEventListener('touchmove', prevent, { passive: false })
  document.addEventListener('gesturestart', prevent)
  document.addEventListener('contextmenu', prevent)
  document.addEventListener('dblclick', prevent)
}
