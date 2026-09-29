export interface MediaAccess {
  microphone: MediaStream | null
  camera: boolean
}

const AUDIO: MediaTrackConstraints = { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
const VIDEO: MediaTrackConstraints = { facingMode: 'user' }

function getMedia(constraints: MediaStreamConstraints): Promise<MediaStream | null> {
  if (!navigator.mediaDevices?.getUserMedia) return Promise.resolve(null)
  return navigator.mediaDevices.getUserMedia(constraints).catch(() => null)
}

export function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop())
}

export async function requestMediaAccess(): Promise<MediaAccess> {
  const both = await getMedia({ audio: AUDIO, video: VIDEO })
  if (both) {
    for (const track of both.getVideoTracks()) {
      track.stop()
      both.removeTrack(track)
    }
    return { microphone: both, camera: true }
  }
  const microphone = await getMedia({ audio: AUDIO })
  const video = await getMedia({ video: VIDEO })
  stopStream(video)
  return { microphone, camera: video !== null }
}

export function openFrontCamera() {
  return getMedia({ video: VIDEO })
}
