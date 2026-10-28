// 骑马钉小册子的物理排版：页数必为偶数，封面在右、封底在左。
// 内容页 = [封面, ...内页, 封底]；页数为奇数时，在封底前补一张空白的封三。

export interface BookletLayout {
  /** 物理页 → 内容页序号；null 表示补上的空白页。 */
  physical: (number | null)[]
  /** 纸张（leaf）数量，每张纸正反两面各一页。 */
  leaves: number
}

export function getBookletLayout(count: number): BookletLayout {
  const content = Array.from({ length: Math.max(count, 0) }, (_, index) => index)
  const physical: (number | null)[] = content.length % 2
    ? [...content.slice(0, -1), null, content[content.length - 1]]
    : content
  return { physical, leaves: physical.length / 2 }
}

export function getPhysicalPage(layout: BookletLayout, index: number): number {
  return Math.max(0, layout.physical.indexOf(index))
}

/** 0 = 合上看封面；leaves = 翻完合上看封底；其余为打开的跨页。 */
export function getSpread(layout: BookletLayout, index: number): number {
  return Math.floor((getPhysicalPage(layout, index) + 1) / 2)
}

/** 跨页左右两侧的物理页；合上时只有一侧。 */
export function getSpreadPages(layout: BookletLayout, spread: number): { left?: number; right?: number } {
  const left = spread * 2 - 1
  const right = spread * 2
  return {
    left: left >= 0 ? left : undefined,
    right: right < layout.physical.length ? right : undefined,
  }
}

/** 翻到某个跨页后作为“当前页”的内容页：优先左页，其次右页。 */
export function getSpreadIndex(layout: BookletLayout, spread: number): number {
  const { left, right } = getSpreadPages(layout, spread)
  for (const page of [left, right]) {
    const index = page === undefined ? null : layout.physical[page]
    if (index !== null && index !== undefined) return index
  }
  return 0
}
