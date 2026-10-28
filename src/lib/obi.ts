import type { Album, ObiDimensions } from '../types/album'
import { getCaseDepth, SCENE_UNITS_PER_MM } from './album'

// 日本印刷厂 10 mm 宝丽盒帯模板（協和産業）：高 121 mm、侧脊 10.5 mm、
// 背面 30 mm（整背款 140 mm）、正面 30 mm 或 15 mm。纸带包在盒外，
// 侧脊对应外壳厚度，高度比 125 mm 的外壳略矮，上下各留约 2 mm。
export const OBI_HEIGHT_MM = 121
export const OBI_DIMENSION_LIMITS = {
  frontWidthMm: { min: 10, max: 60, default: 30 },
  backWidthMm: { min: 5, max: 140, default: 30 },
}
// 旧版上传的 OBI 扫描按当时的尺寸裁剪（正面 46 场景单位、高 125 mm），
// 重新裁剪前保持原几何，避免已有图片被拉伸或错位。
const LEGACY_FRONT_WIDTH_MM = 46 / SCENE_UNITS_PER_MM
const LEGACY_HEIGHT_MM = 125

type ObiAlbum = Pick<Album, 'obiDimensions' | 'discs' | 'caseThicknessMm'> & Partial<Pick<Album, 'obiUrl'>>

function valid(value: unknown, limits: { min: number; max: number; default: number }) {
  return typeof value === 'number' && Number.isFinite(value) && value >= limits.min && value <= limits.max ? value : limits.default
}

function isLegacyUpload(album: ObiAlbum) {
  return !!album.obiUrl && album.obiDimensions?.frontWidthMm === undefined
}

export function getObiDimensions(album: ObiAlbum): Required<ObiDimensions> {
  return {
    frontWidthMm: isLegacyUpload(album) ? LEGACY_FRONT_WIDTH_MM : valid(album.obiDimensions?.frontWidthMm, OBI_DIMENSION_LIMITS.frontWidthMm),
    backWidthMm: valid(album.obiDimensions?.backWidthMm, OBI_DIMENSION_LIMITS.backWidthMm),
  }
}

export function getObiLayout(album: ObiAlbum) {
  const dimensions = getObiDimensions(album)
  const pixels = (mm: number) => Math.round(mm * SCENE_UNITS_PER_MM * 1000000) / 1000000
  const frontWidth = pixels(dimensions.frontWidthMm)
  const backWidth = pixels(dimensions.backWidthMm)
  const height = pixels(isLegacyUpload(album) ? LEGACY_HEIGHT_MM : OBI_HEIGHT_MM)
  const depth = getCaseDepth(album)
  return { frontWidth, backWidth, height, depth, width: backWidth + depth + frontWidth }
}

export type ObiLayout = ReturnType<typeof getObiLayout>
