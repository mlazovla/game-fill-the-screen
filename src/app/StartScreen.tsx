import { APP_NAME } from '../config'
import './StartScreen.css'

interface StartScreenProps {
  levelNumber: number
  levelName: string
  onStart: () => void
}

export function StartScreen({ levelNumber, levelName, onStart }: StartScreenProps) {
  return (
    <div className="start-screen" onClick={onStart}>
      <h1>{APP_NAME}</h1>
      <p>
        Level {levelNumber}: {levelName}
      </p>
      <button type="button">Klepni pro start</button>
    </div>
  )
}
