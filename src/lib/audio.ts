import { t } from '../i18n'

export const AUDIO_ACCEPT = '.mp3,.m4a,.wav,.ogg,.oga,.flac,.aac,.webm,audio/*'

export function formatTime(seconds: number): string {
  const time = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0
  return `${String(Math.floor(time / 60)).padStart(2, '0')}:${String(time % 60).padStart(2, '0')}`
}

export async function readAudio(file: File): Promise<{
  audio: Blob
  audioName: string
  duration: string
}> {
  const types = ['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/ogg', 'application/ogg', 'audio/flac', 'audio/x-flac', 'audio/aac', 'audio/webm']
  if (!types.includes(file.type) && !/\.(mp3|m4a|wav|ogg|oga|flac|aac|webm)$/i.test(file.name)) {
    throw new Error(t('audioErrors.invalidType'))
  }
  if (file.size > 100 * 1024 * 1024) throw new Error(t('audioErrors.tooLarge'))
  if (!file.size) throw new Error(t('audioErrors.decodeFailed'))
  const url = URL.createObjectURL(file)
  const audio = document.createElement('audio')
  audio.preload = 'metadata'
  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    const seconds = await new Promise<number>((resolve, reject) => {
      const fail = () => reject(new Error(t('audioErrors.decodeFailed')))
      audio.onloadedmetadata = () => {
        if (Number.isFinite(audio.duration) && audio.duration > 0) resolve(audio.duration)
        else fail()
      }
      audio.onerror = fail
      timeout = setTimeout(fail, 15000)
      audio.src = url
    })
    return { audio: file, audioName: file.name, duration: formatTime(seconds) }
  } finally {
    clearTimeout(timeout)
    audio.onloadedmetadata = null
    audio.onerror = null
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
    URL.revokeObjectURL(url)
  }
}
