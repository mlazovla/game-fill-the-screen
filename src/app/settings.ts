import { readStored, writeStored } from '../platform/storage'

const SHOW_UI_KEY = 'fill-the-screen.showUi'

export function loadShowUi() {
  return readStored(SHOW_UI_KEY) === '1'
}

export function saveShowUi(showUi: boolean) {
  writeStored(SHOW_UI_KEY, showUi ? '1' : '0')
}
