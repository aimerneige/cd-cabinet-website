import type { Album, ObiDimensions } from '../types/album'
import { CASE_HEIGHT, getCaseDepth, SCENE_UNITS_PER_MM } from './album'

export const OBI_FRONT_WIDTH_MM = 46 / SCENE_UNITS_PER_MM

export const OBI_DIMENSION_LIMITS = {
  backWidthMm: { min: 5, max: 60, default: OBI_FRONT_WIDTH_MM },
}

export function getObiDimensions(album: Pick<Album, 'obiDimensions'>): Required<ObiDimensions> {
  const width = album.obiDimensions?.backWidthMm
  const limits = OBI_DIMENSION_LIMITS.backWidthMm
  return { backWidthMm: typeof width === 'number' && Number.isFinite(width) && width >= limits.min && width <= limits.max ? width : limits.default }
}

export function getObiLayout(album: Pick<Album, 'obiDimensions' | 'discs' | 'caseThicknessMm'>) {
  const dimensions = getObiDimensions(album)
  const pixels = (mm: number) => Math.round(mm * SCENE_UNITS_PER_MM * 1000000) / 1000000
  const frontWidth = 46
  const backWidth = pixels(dimensions.backWidthMm)
  const height = CASE_HEIGHT
  const depth = getCaseDepth(album)
  return { frontWidth, backWidth, height, depth, width: backWidth + depth + frontWidth }
}

export type ObiLayout = ReturnType<typeof getObiLayout>
