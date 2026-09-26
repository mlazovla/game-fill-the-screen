import { useEffect, useState } from 'react'
import { LevelHost } from '../game/LevelHost'
import { LevelTransition, type TransitionPhase } from '../game/LevelTransition'
import { initialLevelIndex, rememberLevel } from '../game/progress'
import { levels } from '../levels'
import { enterImmersiveMode, enterImmersiveModeOnRelease } from '../platform/screen'
import { OrientationGuard } from './OrientationGuard'
import { loadShowUi, saveShowUi } from './settings'
import { StartScreen } from './StartScreen'

type Phase = 'start' | 'playing' | TransitionPhase

export default function App() {
  const [phase, setPhase] = useState<Phase>('start')
  const [levelIndex, setLevelIndex] = useState(() => initialLevelIndex(levels))
  const [showUi, setShowUi] = useState(loadShowUi)
  const level = levels[levelIndex]
  const levelMounted = phase === 'playing' || phase === 'covering' || phase === 'revealing'

  useEffect(() => rememberLevel(level), [level])
  useEffect(() => saveShowUi(showUi), [showUi])

  const start = () => {
    void enterImmersiveMode()
    setPhase('playing')
  }

  const restartFromBeginning = () => {
    enterImmersiveModeOnRelease()
    setLevelIndex(0)
    setPhase('playing')
  }

  const completeLevel = () => setPhase((current) => (current === 'playing' ? 'covering' : current))

  const showNextLevelTitle = () => {
    setLevelIndex((index) => (index + 1) % levels.length)
    setPhase('title')
  }

  if (phase === 'start') {
    return (
      <>
        <StartScreen
          levelNumber={levelIndex + 1}
          levelName={level.name}
          showUi={showUi}
          onShowUiChange={setShowUi}
          onContinue={start}
          onRestart={restartFromBeginning}
        />
        <OrientationGuard />
      </>
    )
  }

  return (
    <>
      {levelMounted && (
        <LevelHost
          key={level.id}
          level={level}
          number={levelIndex + 1}
          total={levels.length}
          showUi={showUi}
          onComplete={completeLevel}
        />
      )}
      {phase !== 'playing' && (
        <LevelTransition
          phase={phase}
          levelNumber={levelIndex + 1}
          onCovered={showNextLevelTitle}
          onTitleShown={() => setPhase('waiting')}
          onContinue={() => setPhase('revealing')}
          onRevealed={() => setPhase('playing')}
        />
      )}
      <OrientationGuard />
    </>
  )
}
