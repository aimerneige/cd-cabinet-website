import { describe, expect, it } from 'vitest'
import { albums } from '../data/albums'
import { withDiscCount } from './album'
import { getArtworkCrop, getCropOutputSize, getRotatedSize, getSpineCrop, type ArtworkKind } from './cropArtwork'
import { getObiLayout } from './obi'

describe('artwork crop dimensions', () => {
  it.each([
    [0, 900, 600],
    [90, 600, 900],
    [-90, 600, 900],
    [180, 900, 600],
    [45, 1500 / Math.sqrt(2), 1500 / Math.sqrt(2)],
    [30, 450 * Math.sqrt(3) + 300, 450 + 300 * Math.sqrt(3)],
  ])('uses the rotated image bounds at %i degrees', (rotation, width, height) => {
    const size = getRotatedSize(900, 600, rotation)
    expect(size.width).toBeCloseTo(width, 8)
    expect(size.height).toBeCloseTo(height, 8)
  })

  it('locks booklet and disc images to a square, with a circular disc guide', () => {
    const kinds: ArtworkKind[] = ['cover', 'bookletBack', 'disc', 'page']
    for (const kind of kinds) {
      expect(getArtworkCrop(kind, albums[0])).toEqual({ width: 1, height: 1, round: kind === 'disc' })
    }
  })

  it('uses the landscape back panel without the separately uploaded spines on both sides', () => {
    for (const kind of ['back', 'backInside'] as const) {
      for (const count of [1, 4, 6]) {
        expect(getArtworkCrop(kind, withDiscCount(albums[0], count))).toEqual({ width: 69, height: 59, round: false })
      }
    }
  })

  it('keeps paper crops independent of disc count while OBI follows the outer case', () => {
    for (const count of [1, 3, 4, 6]) {
      const album = withDiscCount(albums[0], count)
      for (const side of ['spine', 'rightSpine'] as const) {
        expect(getArtworkCrop(side, album)).toEqual({ width: 13, height: 236, round: false })
      }
      const obi = getArtworkCrop('obi', album)
      const layout = getObiLayout(album)
      expect(obi.width / obi.height).toBeCloseTo(layout.width / layout.height, 10)
      expect(obi.round).toBe(false)
    }
  })

  it('uses absolute millimeter limits and 0.1 mm steps against a 118 mm height', () => {
    for (const [input, width] of [[0, 2], [2, 2], [6.54, 6.5], [22.8, 22.8], [40, 40], [100, 40]]) {
      const profile = getSpineCrop(input)
      expect(profile.width / profile.height).toBeCloseTo(width / 118, 10)
    }
  })

  it('uses independent inner paper and outer case dimensions for spine and OBI crops', () => {
    const album = { ...albums[0], spineWidthMm: 6.5, caseThicknessMm: 14 }
    for (const kind of ['spine', 'rightSpine'] as const) {
      const profile = getArtworkCrop(kind, album)
      expect(profile.width / profile.height).toBeCloseTo(6.5 / 118, 10)
    }
    const obi = getArtworkCrop('obi', album)
    // 帯：正面 30 + 侧脊 10.4（外壳厚度）+ 背面 30，高 121 mm。
    expect(obi.width / obi.height).toBeCloseTo((30 + 10.4 + 30) / 121, 6)
  })

  it('keeps rounding within one pixel and limits the longest edge to 2048 pixels', () => {
    for (const kind of ['cover', 'back', 'backInside', 'spine', 'obi'] as const) {
      const profile = getArtworkCrop(kind, withDiscCount(albums[0], 4))
      for (const area of [{ width: 6000, height: 6000 }, { width: 3, height: 10 }, { width: 143, height: 745 }]) {
        const size = getCropOutputSize(area, profile)
        expect(Math.abs(size.width - size.height * profile.width / profile.height)).toBeLessThanOrEqual(1)
        expect(Math.max(size.width, size.height)).toBeLessThanOrEqual(2048)
        expect(Math.min(size.width, size.height)).toBeGreaterThan(0)
      }
    }
    expect(getCropOutputSize({ width: 600, height: 600 }, getArtworkCrop('cover', albums[0]))).toEqual({ width: 600, height: 600 })
  })

  it('bounds output even when an adjusted ratio needs more than 2048 integer pixels', () => {
    for (const widthMm of [2, 6.5, 9.1, 22.8, 40]) {
      for (const profile of [getSpineCrop(widthMm), getArtworkCrop('obi', { spineWidthMm: widthMm })]) {
        for (const area of [{ width: 9000, height: 9000 }, { width: 60, height: 600 }]) {
          const size = getCropOutputSize(area, profile)
          expect(Math.max(size.width, size.height)).toBeLessThanOrEqual(2048)
          expect(Math.abs(size.width - size.height * profile.width / profile.height)).toBeLessThanOrEqual(1)
        }
      }
    }
  })
})
