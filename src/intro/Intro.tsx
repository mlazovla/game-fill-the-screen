import { useState } from 'react'
import { GoalStep } from './GoalStep'
import { MediaStep } from './MediaStep'
import { PictureStep } from './PictureStep'
import { SensorsStep } from './SensorsStep'
import { WelcomeStep } from './WelcomeStep'
import './Intro.css'

type Step = 'welcome' | 'goal' | 'sensors' | 'media' | 'picture'

export default function Intro({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<Step>('welcome')
  const [nextStep, setNextStep] = useState<Step | null>(null)
  const [camera, setCamera] = useState(false)

  return (
    <div className="intro">
      <div
        key={step}
        className={nextStep ? 'intro__step is-leaving' : 'intro__step'}
        onAnimationEnd={(event) => {
          if (event.target !== event.currentTarget || !nextStep) return
          setStep(nextStep)
          setNextStep(null)
        }}
      >
        {step === 'welcome' && <WelcomeStep onDone={() => setStep('goal')} />}
        {step === 'goal' && <GoalStep onContinue={() => setNextStep('sensors')} />}
        {step === 'sensors' && <SensorsStep onContinue={() => setNextStep('media')} />}
        {step === 'media' && (
          <MediaStep
            onContinue={(cameraAllowed) => {
              setCamera(cameraAllowed)
              setNextStep('picture')
            }}
          />
        )}
        {step === 'picture' && <PictureStep camera={camera} onContinue={onDone} />}
      </div>
    </div>
  )
}
