import { lazy, Suspense, useEffect, useState } from 'react'
import { LevelHost } from '../game/LevelHost'
import { LevelTransition, type TransitionPhase } from '../game/LevelTransition'
import { initialLevelIndex, rememberLevel } from '../game/progress'
import { levels } from '../levels'
import { getAudioOutput, setSoundMuted } from '../platform/audio'
import { requestMotionPermission } from '../platform/deviceGravity'
import { enterImmersiveMode, enterImmersiveModeOnRelease } from '../platform/screen'
import { armBackGuard, useBackButton } from '../platform/useBackButton'
import { OrientationGuard } from './OrientationGuard'
import { QUIT_BUTTON_VISIBLE_MS, QuitButton } from './QuitButton'
import { loadIntroSeen, loadShowUi, loadSoundOn, saveIntroSeen, saveShowUi, saveSoundOn } from './settings'
import { StartScreen } from './StartScreen'

const Intro = lazy(() => import('../intro/Intro'))

type Phase = 'intro' | 'start' | 'playing' | TransitionPhase

const shouldPlayIntro = () => !loadIntroSeen() && !new URLSearchParams(window.location.search).has('level')

export default function App() {
  const [phase, setPhase] = useState<Phase>(() => (shouldPlayIntro() ? 'intro' : 'start'))
  const [levelIndex, setLevelIndex] = useState(() => initialLevelIndex(levels))
  const [showUi, setShowUi] = useState(loadShowUi)
  const [soundOn, setSoundOn] = useState(loadSoundOn)
  const [finished, setFinished] = useState(false)
  const [leavingIntro, setLeavingIntro] = useState(false)
  const [quitShownAt, setQuitShownAt] = useState<number | null>(null)
  const level = levels[levelIndex]
  const introMounted = phase === 'intro' || leavingIntro
  const levelMounted = !finished && !leavingIntro && (phase === 'playing' || phase === 'covering' || phase === 'revealing')
  const startScreenMounted = phase === 'start' || (finished && phase === 'revealing')

  useEffect(() => rememberLevel(level), [level])
  useEffect(() => saveShowUi(showUi), [showUi])
  useEffect(() => {
    saveSoundOn(soundOn)
    setSoundMuted(!soundOn)
  }, [soundOn])

  useBackButton(() => setQuitShownAt(performance.now()), phase !== 'start')

  useEffect(() => {
    if (quitShownAt === null) return
    const timeout = setTimeout(() => setQuitShownAt(null), QUIT_BUTTON_VISIBLE_MS)
    return () => clearTimeout(timeout)
  }, [quitShownAt])

  const prepareLevel = (index: number) => {
    if (levels[index].usesMotion) void requestMotionPermission()
    if (levels[index].usesAudio) getAudioOutput()
  }

  const start = () => {
    armBackGuard()
    prepareLevel(levelIndex)
    void enterImmersiveMode()
    setPhase('playing')
  }

  const jumpToLevel = (index: number) => {
    armBackGuard()
    prepareLevel(index)
    void enterImmersiveMode()
    setLevelIndex(index)
    setPhase('playing')
  }

  const restartFromBeginning = () => {
    enterImmersiveModeOnRelease()
    setLevelIndex(0)
    setPhase('playing')
  }

  const replayIntro = () => {
    armBackGuard()
    setPhase('intro')
  }

  const finishIntro = () => {
    saveIntroSeen()
    setLeavingIntro(true)
    setPhase('covering')
  }

  const completeLevel = () => setPhase((current) => (current === 'playing' ? 'covering' : current))

  const showNextTitle = () => {
    if (leavingIntro) {
      setLeavingIntro(false)
      setPhase('title')
      return
    }
    setFinished(levelIndex === levels.length - 1)
    setLevelIndex((index) => (index + 1) % levels.length)
    setPhase('title')
  }

  const goHome = () => {
    setQuitShownAt(null)
    setFinished(false)
    setLeavingIntro(false)
    setPhase('start')
  }

  const finishTransition = () => {
    setPhase(finished ? 'start' : 'playing')
    setFinished(false)
  }

  return (
    <>
      {startScreenMounted && (
        <StartScreen
          levelNumber={levelIndex + 1}
          levelName={level.name}
          levelCount={levels.length}
          showUi={showUi}
          onShowUiChange={setShowUi}
          soundOn={soundOn}
          onSoundChange={setSoundOn}
          onContinue={start}
          onRestart={restartFromBeginning}
          onJumpToLevel={jumpToLevel}
          onReplayIntro={replayIntro}
        />
      )}
      {introMounted && (
        <Suspense fallback={null}>
          <Intro onDone={finishIntro} />
        </Suspense>
      )}
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
      {phase !== 'start' && phase !== 'playing' && phase !== 'intro' && (
        <LevelTransition
          phase={phase}
          levelNumber={finished ? null : levelIndex + 1}
          onCovered={showNextTitle}
          onTitleShown={() => setPhase('waiting')}
          onContinue={() => {
            prepareLevel(levelIndex)
            setPhase('revealing')
          }}
          onRevealed={finishTransition}
        />
      )}
      {quitShownAt !== null && phase !== 'start' && <QuitButton key={quitShownAt} onQuit={goHome} />}
      <OrientationGuard />
    </>
  )
}
