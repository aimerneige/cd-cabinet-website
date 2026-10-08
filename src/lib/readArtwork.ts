export async function readArtwork(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Choose a JPG, PNG or WebP image.')
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Choose an image smaller than 5 MB.')
  }
  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () =>
      reject(new Error('The image could not be read. Please try again.'))
    reader.onabort = () => reject(new Error('Image loading was interrupted.'))
    reader.readAsDataURL(file)
  })
  const image = new Image()
  image.src = source
  try {
    await image.decode()
  } catch {
    throw new Error('This file could not be opened as an image.')
  }
  return source
}
