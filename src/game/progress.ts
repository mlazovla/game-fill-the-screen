import type { LevelDefinition } from './types'

const STORAGE_KEY = 'fill-the-screen.level'

function readStoredLevel() {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function initialLevelIndex(levels: LevelDefinition[]) {
  const requested = new URLSearchParams(window.location.search).get('level') ?? readStoredLevel()
  if (!requested) return 0
  if (/^\d+$/.test(requested)) {
    const index = Number(requested) - 1
    return index >= 0 && index < levels.length ? index : 0
  }
  return Math.max(0, levels.findIndex((level) => level.id === requested))
}

export function rememberLevel(level: LevelDefinition) {
  try {
    localStorage.setItem(STORAGE_KEY, level.id)
  } catch {
    return
  }
}
