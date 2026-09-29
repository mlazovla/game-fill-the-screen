import { readStored, writeStored } from '../platform/storage'

const SHOW_UI_KEY = 'fill-the-screen.showUi'

export function loadShowUi() {
  return readStored(SHOW_UI_KEY) === '1'
}

export function saveShowUi(showUi: boolean) {
  writeStored(SHOW_UI_KEY, showUi ? '1' : '0')
}

const SOUND_ON_KEY = 'fill-the-screen.soundOn'

export function loadSoundOn() {
  return readStored(SOUND_ON_KEY) !== '0'
}

export function saveSoundOn(soundOn: boolean) {
  writeStored(SOUND_ON_KEY, soundOn ? '1' : '0')
}

const INTRO_SEEN_KEY = 'fill-the-screen.introSeen'

export function loadIntroSeen() {
  return readStored(INTRO_SEEN_KEY) === '1'
}

export function saveIntroSeen() {
  writeStored(INTRO_SEEN_KEY, '1')
}
