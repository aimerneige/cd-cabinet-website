import { describe, expect, it } from 'vitest'
import { getObiDimensions, getObiLayout } from './obi'
import { getArtworkCrop } from './cropArtwork'
import { getObiArtwork } from './generatedCover'

describe('OBI dimensions', () => {
  it('keeps standard dimensions and follows case thickness by default', () => {
    expect(getObiLayout({})).toEqual({ frontWidth: 46, backWidth: 46, height: 304, depth: 32, width: 124 })
    expect(getObiLayout({ spineWidthMm: 6.5 }).depth).toBeCloseTo(6.5 * 300 / 118 + 8, 10)
  })

  it('applies asymmetric flap widths and height consistently to crops and generated artwork', () => {
    const album = {
      title: 'Custom OBI', artist: 'Artist', year: 2026, genre: 'Ambient', color: '#336644', ink: '#ffffff', coverUrl: '/cover.png',
      obiDimensions: { frontWidthMm: 30, backWidthMm: 10, heightMm: 90 },
    }
    const layout = getObiLayout(album)
    expect(layout.frontWidth).toBeCloseTo(30 * 300 / 118, 5)
    expect(layout.backWidth).toBeCloseTo(10 * 300 / 118, 5)
    expect(layout.height).toBeCloseTo(90 * 300 / 118, 5)
    expect(layout.width).toBe(layout.frontWidth + layout.backWidth + layout.depth)
    const crop = getArtworkCrop('obi', album)
    expect(crop.width / crop.height).toBeCloseTo(layout.width / layout.height, 8)
    const source = decodeURIComponent(getObiArtwork(album))
    expect(source).toContain(`viewBox="0 0 ${layout.width} ${layout.height}"`)
    expect(source).toContain(`data-obi-panel="spine" transform="translate(${layout.backWidth} 0)`)
    expect(source).toContain(`data-obi-panel="front" transform="translate(${layout.backWidth + layout.depth} 0)`)
  })

  it('uses defaults for invalid dimensions without affecting valid fields', () => {
    const dimensions = getObiDimensions({ obiDimensions: { frontWidthMm: NaN, backWidthMm: 10, heightMm: 1000 } })
    expect(dimensions.frontWidthMm).toBe(getObiDimensions({}).frontWidthMm)
    expect(dimensions.backWidthMm).toBe(10)
    expect(dimensions.heightMm).toBe(getObiDimensions({}).heightMm)
  })
})
