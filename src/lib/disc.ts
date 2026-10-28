import type { AlbumDisc, DiscFormat } from '../types/album'

// CD 物理尺寸（ECMA-130 §8）与压盘厂盘面印刷范围。
// 中心孔 15 mm；15–44 mm 为透明塑料（夹持区 26–33 mm）；
// 反射层/信息区到 118 mm，外缘 120 mm。
// 盘面印刷：压盘厂通常 23–116 mm（新进商会 23/116，Duplication 22/116），
// 内外两圈保持透明不印刷。
export const DISC_DIAMETER_MM = 120
export const DISC_HOLE_MM = 15
export const LABEL_INNER_MM = 23
export const LABEL_OUTER_MM = 116

/** 相对整张光盘直径的比例，便于在任意尺寸下绘制。 */
export const LABEL_INNER_RATIO = LABEL_INNER_MM / DISC_DIAMETER_MM
export const LABEL_OUTER_RATIO = LABEL_OUTER_MM / DISC_DIAMETER_MM

export const DISC_FORMATS: DiscFormat[] = ['cd', 'dvd', 'bd']
const FORMAT_SHORT: Record<DiscFormat, string> = { cd: 'CD', dvd: 'DVD', bd: 'BD' }
/** 生成盘面上印刷的类型标识。 */
export const DISC_FORMAT_MARK: Record<DiscFormat, string> = { cd: 'COMPACT DISC · DIGITAL AUDIO', dvd: 'DVD VIDEO', bd: 'BLU-RAY DISC' }

export function getDiscFormat(disc: Pick<AlbumDisc, 'format'>): DiscFormat {
  return disc.format && DISC_FORMATS.includes(disc.format) ? disc.format : 'cd'
}

export function getDiscFormatShort(disc: Pick<AlbumDisc, 'format'>): string {
  return FORMAT_SHORT[getDiscFormat(disc)]
}

/** 包装上印刷的光盘数量，例如 "1 CD"、"3 CDs"、"2 CDs + 1 BD"。 */
export function getDiscCountLabel(discs: Pick<AlbumDisc, 'format'>[]): string {
  const list = discs.length ? discs : [{}]
  return DISC_FORMATS.map((format) => {
    const count = list.filter((disc) => getDiscFormat(disc) === format).length
    return count ? `${count} ${FORMAT_SHORT[format]}${count > 1 ? 's' : ''}` : ''
  }).filter(Boolean).join(' + ')
}

/** 全是 CD 时返回 null，交给本地化文案显示。 */
export function getMixedFormatSummary(discs: Pick<AlbumDisc, 'format'>[]): string | null {
  return discs.some((disc) => getDiscFormat(disc) !== 'cd') ? getDiscCountLabel(discs).replace(/(\d+ [A-Z]+)s\b/g, '$1') : null
}
