import type { Album } from '../types/album'
import { t } from '../i18n'
import { clampSpineWidthMm, isSpineWidthMm, SPINE_HEIGHT_MM } from './album'
import { cropArtwork, getSpineCrop, type ArtworkCropResult } from './cropArtwork'

async function loadImage(source: string) {
  const image = new Image()
  image.src = source
  try { await image.decode() }
  catch { throw new Error(t('artworkErrors.decodeFailed')) }
  return image
}

function cropToWidth(image: HTMLImageElement, widthMm: number): string {
  const profile = getSpineCrop(widthMm)
  const width = Math.min(image.naturalWidth, image.naturalHeight * profile.width / profile.height)
  // 两侧共用较薄宽度，自动从中心等量裁去边缘，不拉伸已有图案。
  return cropArtwork(image, { x: (image.naturalWidth - width) / 2, y: 0, width, height: image.naturalHeight }, profile)
}

export async function alignSpineArtwork(
  album: Pick<Album, 'spineUrl' | 'rightSpineUrl' | 'spineWidthMm'>,
  side: 'left' | 'right',
  result: ArtworkCropResult,
): Promise<Pick<Album, 'spineUrl' | 'rightSpineUrl' | 'spineWidthMm'>> {
  if (!isSpineWidthMm(result.spineWidthMm)) throw new Error(t('crop.failed'))
  const selectedWidth = clampSpineWidthMm(result.spineWidthMm)
  const otherSource = side === 'left' ? album.rightSpineUrl : album.spineUrl
  let otherImage: HTMLImageElement | undefined
  let otherWidth = isSpineWidthMm(album.spineWidthMm) ? album.spineWidthMm : selectedWidth
  if (otherSource && !isSpineWidthMm(album.spineWidthMm)) {
    otherImage = await loadImage(otherSource)
    otherWidth = clampSpineWidthMm(otherImage.naturalWidth / otherImage.naturalHeight * SPINE_HEIGHT_MM)
  }
  const width = otherSource ? Math.min(selectedWidth, otherWidth) : selectedWidth
  const source = selectedWidth > width ? cropToWidth(await loadImage(result.source), width) : result.source
  const other = otherSource && otherWidth > width ? cropToWidth(otherImage ?? await loadImage(otherSource), width) : otherSource
  return side === 'left'
    ? { spineUrl: source, rightSpineUrl: other, spineWidthMm: width }
    : { spineUrl: other, rightSpineUrl: source, spineWidthMm: width }
}
