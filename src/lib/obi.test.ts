import { describe, expect, it } from 'vitest'
import { getObiDimensions, getObiLayout } from './obi'
import { getArtworkCrop } from './cropArtwork'
import { getObiArtwork } from './generatedCover'
import { CASE_HEIGHT, getCaseDepth } from './album'

describe('OBI dimensions', () => {
  it('keeps standard dimensions and ignores legacy custom case thickness', () => {
    const depth = getCaseDepth({})
    expect(getObiLayout({})).toEqual({ frontWidth: 46, backWidth: 46, height: CASE_HEIGHT, depth, width: 92 + depth })
    const album = { spineWidthMm: 2, caseThicknessMm: 14 }
    expect(getObiLayout(album).depth).toBeCloseTo(10.4 * 300 / 118, 10)
    const widePaper = { ...album, spineWidthMm: 40 }
    expect(getObiLayout(album)).toEqual(getObiLayout(widePaper))
  })

  it('fixes the front, height and outer thickness while applying the back width consistently', () => {
    const album = {
      title: 'Custom OBI', artist: 'Artist', year: 2026, genre: 'Ambient', color: '#336644', ink: '#ffffff', coverUrl: '/cover.png',
      obiDimensions: { backWidthMm: 10 }, caseThicknessMm: 14,
    }
    const layout = getObiLayout(album)
    expect(layout.frontWidth).toBe(46)
    expect(layout.backWidth).toBeCloseTo(10 * 300 / 118, 5)
    expect(layout.height).toBeCloseTo(125 * 300 / 118, 5)
    expect(layout.depth).toBeCloseTo(10.4 * 300 / 118, 5)
    expect(layout.width).toBe(layout.backWidth + layout.depth + layout.frontWidth)
    const crop = getArtworkCrop('obi', album)
    expect(crop.width / crop.height).toBeCloseTo(layout.width / layout.height, 8)
    const source = decodeURIComponent(getObiArtwork(album))
    expect(source).toContain(`viewBox="0 0 ${layout.width} ${layout.height}"`)
    expect(source).toContain(`data-obi-panel="spine" transform="translate(${layout.backWidth} 0)`)
    expect(source).toContain(`data-obi-panel="front" transform="translate(${layout.backWidth + layout.depth} 0)`)
  })

  it('uses the default for invalid back widths', () => {
    for (const backWidthMm of [NaN, Infinity, 0, 61]) {
      expect(getObiDimensions({ obiDimensions: { backWidthMm } })).toEqual(getObiDimensions({}))
    }
  })
})
