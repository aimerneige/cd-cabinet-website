import { describe, expect, it } from 'vitest'
import { getBookletLayout, getSpread, getSpreadIndex, getSpreadPages } from './booklet'

describe('booklet layout', () => {
  it('keeps an even page count by adding a blank inside back cover', () => {
    expect(getBookletLayout(2)).toEqual({ physical: [0, 1], leaves: 1 })
    expect(getBookletLayout(4)).toEqual({ physical: [0, 1, 2, 3], leaves: 2 })
    expect(getBookletLayout(5)).toEqual({ physical: [0, 1, 2, 3, null, 4], leaves: 3 })
  })

  it('opens from the front cover through two-page spreads to the back cover', () => {
    const layout = getBookletLayout(5)
    expect([0, 1, 2, 3, 4].map((index) => getSpread(layout, index))).toEqual([0, 1, 1, 2, 3])
    expect(getSpreadPages(layout, 0)).toEqual({ left: undefined, right: 0 })
    expect(getSpreadPages(layout, 2)).toEqual({ left: 3, right: 4 })
    expect(getSpreadPages(layout, 3)).toEqual({ left: 5, right: undefined })
    expect([0, 1, 2, 3].map((spread) => getSpreadIndex(layout, spread))).toEqual([0, 1, 3, 4])
  })
})
