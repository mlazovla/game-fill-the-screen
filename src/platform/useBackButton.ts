import { useEffect, useEffectEvent } from 'react'

const GUARD_STATE = 'back-guard'

type ActivationNavigator = Navigator & { userActivation?: { isActive: boolean } }

const hasUserActivation = () => (navigator as ActivationNavigator).userActivation?.isActive ?? true

export function armBackGuard() {
  if (history.state !== GUARD_STATE && hasUserActivation()) history.pushState(GUARD_STATE, '')
}

export function useBackButton(onBack: () => void, enabled: boolean) {
  const handleBack = useEffectEvent(onBack)

  useEffect(() => {
    if (!enabled) return

    armBackGuard()
    window.addEventListener('popstate', handleBack)
    window.addEventListener('pointerdown', armBackGuard, true)
    window.addEventListener('pointerup', armBackGuard, true)
    return () => {
      window.removeEventListener('popstate', handleBack)
      window.removeEventListener('pointerdown', armBackGuard, true)
      window.removeEventListener('pointerup', armBackGuard, true)
    }
  }, [enabled])
}
