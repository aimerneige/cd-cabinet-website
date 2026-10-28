import { describe, expect, it } from 'vitest'
import { getObiDimensions, getObiLayout } from './obi'
import { getArtworkCrop } from './cropArtwork'
import { getObiArtwork } from './generatedCover'
import { getCaseDepth } from './album'

describe('OBI dimensions', () => {
  it('keeps standard dimensions and ignores legacy custom case thickness', () => {
    const depth = getCaseDepth({})
    const mm = (value: number) => Math.round(value * 300 / 118 * 1e6) / 1e6
    // 印刷厂标准：高 121、正背各 30、侧脊为外壳厚度 10.4。
    expect(getObiLayout({})).toEqual({ frontWidth: mm(30), backWidth: mm(30), height: mm(121), depth, width: mm(30) * 2 + depth })
    const album = { spineWidthMm: 2, caseThicknessMm: 14 }
    expect(getObiLayout(album).depth).toBeCloseTo(10.4 * 300 / 118, 10)
    const widePaper = { ...album, spineWidthMm: 40 }
    expect(getObiLayout(album)).toEqual(getObiLayout(widePaper))
  })

  it('keeps legacy uploaded scans on their original geometry until they are recropped', () => {
    const legacy = getObiLayout({ obiUrl: 'data:image/png;base64,scan', obiDimensions: { backWidthMm: 12 } })
    expect(legacy.frontWidth).toBeCloseTo(46, 5)
    expect(legacy.height).toBeCloseTo(125 * 300 / 118, 5)
    const recropped = getObiLayout({ obiUrl: 'data:image/png;base64,scan', obiDimensions: { frontWidthMm: 15, backWidthMm: 12 } })
    expect(recropped.frontWidth).toBeCloseTo(15 * 300 / 118, 5)
    expect(recropped.height).toBeCloseTo(121 * 300 / 118, 5)
  })

  it('applies front and back widths with a fixed height and outer thickness', () => {
    const album = {
      title: 'Custom OBI', artist: 'Artist', year: 2026, genre: 'Ambient', color: '#336644', ink: '#ffffff', coverUrl: '/cover.png',
      obiDimensions: { frontWidthMm: 15, backWidthMm: 10 }, caseThicknessMm: 14,
    }
    const layout = getObiLayout(album)
    expect(layout.frontWidth).toBeCloseTo(15 * 300 / 118, 5)
    expect(layout.backWidth).toBeCloseTo(10 * 300 / 118, 5)
    expect(layout.height).toBeCloseTo(121 * 300 / 118, 5)
    expect(layout.depth).toBeCloseTo(10.4 * 300 / 118, 5)
    expect(layout.width).toBe(layout.backWidth + layout.depth + layout.frontWidth)
    const crop = getArtworkCrop('obi', album)
    expect(crop.width / crop.height).toBeCloseTo(layout.width / layout.height, 8)
    const source = decodeURIComponent(getObiArtwork(album))
    expect(source).toContain(`viewBox="0 0 ${layout.width} ${layout.height}"`)
    expect(source).toContain(`data-obi-panel="spine" transform="translate(${layout.backWidth} 0)`)
    expect(source).toContain(`data-obi-panel="front" transform="translate(${layout.backWidth + layout.depth} 0)`)
  })

  it('uses the defaults for invalid widths and allows a full-back OBI', () => {
    for (const backWidthMm of [NaN, Infinity, 0, 141]) {
      expect(getObiDimensions({ obiDimensions: { backWidthMm } })).toEqual(getObiDimensions({}))
    }
    for (const frontWidthMm of [NaN, 9, 61]) {
      expect(getObiDimensions({ obiDimensions: { frontWidthMm } })).toEqual(getObiDimensions({}))
    }
    expect(getObiDimensions({ obiDimensions: { backWidthMm: 140 } }).backWidthMm).toBe(140)
  })
})
