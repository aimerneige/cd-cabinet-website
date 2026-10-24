import type { Area } from 'react-easy-crop'
import type { Album, ObiDimensions } from '../types/album'
import { clampSpineWidthMm, getSpineWidthMm, SPINE_HEIGHT_MM } from './album'
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
  obiDimensions?: ObiDimensions
}

export function getArtworkCrop(kind: ArtworkKind, album: Pick<Album, 'discs' | 'spineWidthMm' | 'caseThicknessMm' | 'obiDimensions'>): ArtworkCrop {
  const obi = kind === 'obi' ? getObiLayout(album) : undefined
  const [width, height] = kind === 'spine' || kind === 'rightSpine' ? [Math.round(getSpineWidthMm(album) * 10), SPINE_HEIGHT_MM * 10]
    : obi ? [Math.round(obi.width * 1e9), Math.round(obi.height * 1e9)]
    : kind === 'back' || kind === 'backInside' ? [138, 118] : [1, 1]
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

export function getRotatedSize(width: number, height: number, rotation: number) {
  const radians = rotation * Math.PI / 180
  return {
    width: Math.abs(Math.cos(radians) * width) + Math.abs(Math.sin(radians) * height),
    height: Math.abs(Math.sin(radians) * width) + Math.abs(Math.cos(radians) * height),
  }
}

export function cropArtwork(image: HTMLImageElement, area: Area, profile: ArtworkCrop, rotation = 0): string {
  const canvas = document.createElement('canvas')
  const size = getCropOutputSize(area, profile)
  canvas.width = size.width
  canvas.height = size.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas is unavailable.')
  if (rotation === 0) {
    context.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, size.width, size.height)
  } else {
    const bounds = getRotatedSize(image.naturalWidth, image.naturalHeight, rotation)
    // 裁剪坐标基于旋转后的包围盒；直接绘入输出画布，避免为高清原图再分配一张大画布。
    context.scale(size.width / area.width, size.height / area.height)
    context.translate(bounds.width / 2 - area.x, bounds.height / 2 - area.y)
    context.rotate(rotation * Math.PI / 180)
    context.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2)
  }
  return canvas.toDataURL('image/png')
}
