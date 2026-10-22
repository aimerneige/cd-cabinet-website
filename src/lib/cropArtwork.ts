import type { Area } from 'react-easy-crop'
import type { Album } from '../types/album'
import { getCaseDepth } from './album'

export type ArtworkKind = 'cover' | 'bookletBack' | 'spine' | 'rightSpine' | 'back' | 'backInside' | 'obi' | 'disc' | 'page'
export interface ArtworkCrop {
  width: number
  height: number
  round: boolean
}

export function getArtworkCrop(kind: ArtworkKind, album: Pick<Album, 'discs'>): ArtworkCrop {
  const depth = getCaseDepth(album)
  const [width, height] = kind === 'spine' || kind === 'rightSpine' ? [depth, 300]
    : kind === 'obi' ? [92 + depth + 8, 304]
    : kind === 'back' || kind === 'backInside' ? [138, 118] : [1, 1]
  let divisor = width
  let remainder = height
  while (remainder) [divisor, remainder] = [remainder, divisor % remainder]
  return { width: width / divisor, height: height / divisor, round: kind === 'disc' }
}

export function getCropOutputSize(area: Pick<Area, 'width' | 'height'>, profile: ArtworkCrop) {
  // 按最简整数比例输出，避免细侧脊和 OBI 在像素取整后变形；限制大图的内存占用。
  const units = Math.max(1, Math.floor(Math.min(area.width / profile.width, area.height / profile.height, 2048 / Math.max(profile.width, profile.height))))
  return { width: profile.width * units, height: profile.height * units }
}

export function cropArtwork(image: HTMLImageElement, area: Area, profile: ArtworkCrop): string {
  const canvas = document.createElement('canvas')
  const size = getCropOutputSize(area, profile)
  canvas.width = size.width
  canvas.height = size.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas is unavailable.')
  context.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, size.width, size.height)
  return canvas.toDataURL('image/png')
}
