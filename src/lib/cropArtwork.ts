import type { Area } from 'react-easy-crop'
import type { Album } from '../types/album'
import { clampSpineWidthMm, getCaseDepth, isSpineWidthMm, SPINE_HEIGHT_MM } from './album'
import { getObiLayout } from './obi'

export type ArtworkKind = 'cover' | 'bookletBack' | 'spine' | 'rightSpine' | 'back' | 'backInside' | 'obi' | 'disc' | 'page'
export interface ArtworkCrop {
  width: number
  height: number
  round: boolean
}
export interface ArtworkCropResult {
  source: string
  spineWidthMm?: number
}

export function getArtworkCrop(kind: ArtworkKind, album: Pick<Album, 'discs' | 'spineWidthMm' | 'obiDimensions'>): ArtworkCrop {
  const depth = getCaseDepth(album)
  const customWidth = isSpineWidthMm(album.spineWidthMm) ? album.spineWidthMm : undefined
  const obi = kind === 'obi' ? getObiLayout(album) : undefined
  let [width, height] = kind === 'spine' || kind === 'rightSpine' ? [depth, 300]
    : obi ? [Math.round(obi.width * 1e9), Math.round(obi.height * 1e9)]
    : kind === 'back' || kind === 'backInside' ? [138, 118] : [1, 1]
  if (customWidth !== undefined && (kind === 'spine' || kind === 'rightSpine')) {
    width = Math.round(customWidth * 10)
    height = SPINE_HEIGHT_MM * 10
  }
  let divisor = width
  let remainder = height
  while (remainder) [divisor, remainder] = [remainder, divisor % remainder]
  return { width: width / divisor, height: height / divisor, round: kind === 'disc' }
}

export function getSpineCrop(widthMm: number): ArtworkCrop {
  return { width: Math.round(clampSpineWidthMm(widthMm) * 10), height: SPINE_HEIGHT_MM * 10, round: false }
}

export function getCropOutputSize(area: Pick<Area, 'width' | 'height'>, profile: ArtworkCrop) {
  const scale = Math.min(area.width / profile.width, area.height / profile.height, 2048 / Math.max(profile.width, profile.height))
  const units = Math.floor(scale)
  if (units >= 1) return { width: profile.width * units, height: profile.height * units }
  // 微调后的比例可能需要很大的整数尺寸；允许一个像素内的取整误差，避免超出尺寸限制。
  return { width: Math.max(1, Math.round(profile.width * scale)), height: Math.max(1, Math.round(profile.height * scale)) }
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
