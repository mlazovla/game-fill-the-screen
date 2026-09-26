import { useEffect, useState } from 'react'
import { LevelHost } from '../game/LevelHost'
import { initialLevelIndex, rememberLevel } from '../game/progress'
import { levels } from '../levels'
import { enterImmersiveMode } from '../platform/screen'
import { OrientationGuard } from './OrientationGuard'
import { StartScreen } from './StartScreen'

export default function App() {
  const [started, setStarted] = useState(false)
  const [levelIndex, setLevelIndex] = useState(() => initialLevelIndex(levels))
  const [attempt, setAttempt] = useState(0)
  const level = levels[levelIndex]

  useEffect(() => rememberLevel(level), [level])

  const start = () => {
    void enterImmersiveMode()
    setStarted(true)
  }

  const nextLevel = () => {
    setLevelIndex((index) => (index + 1) % levels.length)
    setAttempt((n) => n + 1)
  }

  return (
    <>
      {started ? (
        <LevelHost
          key={`${level.id}:${attempt}`}
          level={level}
          number={levelIndex + 1}
          total={levels.length}
          onNext={nextLevel}
          onRestart={() => setAttempt((n) => n + 1)}
        />
      ) : (
        <StartScreen levelNumber={levelIndex + 1} levelName={level.name} onStart={start} />
      )}
      <OrientationGuard />
    </>
  )
}
