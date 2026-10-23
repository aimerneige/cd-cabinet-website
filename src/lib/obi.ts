import type { Album, ObiDimensions } from '../types/album'
import { CASE_HEIGHT, getCaseDepth, SPINE_HEIGHT_MM } from './album'

export const OBI_DIMENSION_LIMITS = {
  frontWidthMm: { min: 5, max: 60, default: 46 * SPINE_HEIGHT_MM / 300 },
  backWidthMm: { min: 5, max: 60, default: 46 * SPINE_HEIGHT_MM / 300 },
  heightMm: { min: 40, max: 130, default: (CASE_HEIGHT + 4) * SPINE_HEIGHT_MM / 300 },
}

export function getObiDimensions(album: Pick<Album, 'obiDimensions'>): Required<ObiDimensions> {
  function value(key: keyof ObiDimensions) {
    const width = album.obiDimensions?.[key]
    const limits = OBI_DIMENSION_LIMITS[key]
    return typeof width === 'number' && Number.isFinite(width) && width >= limits.min && width <= limits.max ? width : limits.default
  }
  return { frontWidthMm: value('frontWidthMm'), backWidthMm: value('backWidthMm'), heightMm: value('heightMm') }
}

export function getObiLayout(album: Pick<Album, 'obiDimensions' | 'discs' | 'spineWidthMm'>) {
  const dimensions = getObiDimensions(album)
  const pixels = (mm: number) => Math.round(mm * 300 / SPINE_HEIGHT_MM * 1000000) / 1000000
  const frontWidth = pixels(dimensions.frontWidthMm)
  const backWidth = pixels(dimensions.backWidthMm)
  const height = pixels(dimensions.heightMm)
  const depth = getCaseDepth(album) + 8
  return { frontWidth, backWidth, height, depth, width: backWidth + depth + frontWidth }
}

export type ObiLayout = ReturnType<typeof getObiLayout>
