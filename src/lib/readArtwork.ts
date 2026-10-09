import { t } from '../i18n'

export async function readArtwork(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error(t('artworkErrors.invalidType'))
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error(t('artworkErrors.tooLarge'))
  }
  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () =>
      reject(new Error(t('artworkErrors.readFailed')))
    reader.onabort = () => reject(new Error(t('artworkErrors.interrupted')))
    reader.readAsDataURL(file)
  })
  const image = new Image()
  image.src = source
  try {
    await image.decode()
  } catch {
    throw new Error(t('artworkErrors.decodeFailed'))
  }
  return source
}
