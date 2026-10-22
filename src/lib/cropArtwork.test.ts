import { describe, expect, it } from 'vitest'
import { albums } from '../data/albums'
import { withDiscCount } from './album'
import { getArtworkCrop, getCropOutputSize, resizeSpineCrop, type ArtworkKind } from './cropArtwork'

describe('artwork crop dimensions', () => {
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

  it('matches both spines and the unfolded OBI to the selected case thickness', () => {
    for (const count of [1, 3, 4, 6]) {
      const album = withDiscCount(albums[0], count)
      const thick = count > 3
      for (const side of ['spine', 'rightSpine'] as const) {
        expect(getArtworkCrop(side, album)).toEqual({ width: thick ? 29 : 2, height: thick ? 150 : 25, round: false })
      }
      expect(getArtworkCrop('obi', album)).toEqual({ width: thick ? 79 : 31, height: thick ? 152 : 76, round: false })
    }
  })

  it('bounds spine crop adjustments to 75–125% of the default while preserving height', () => {
    for (const count of [1, 4]) {
      const profile = getArtworkCrop('spine', withDiscCount(albums[0], count))
      for (const [input, percent] of [[30, 75], [75, 75], [100, 100], [125, 125], [200, 125]]) {
        const resized = resizeSpineCrop(profile, input)
        expect(resized.width / resized.height).toBeCloseTo(profile.width / profile.height * percent / 100, 10)
      }
    }
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
    for (const count of [1, 4]) {
      for (const percent of [75, 91, 100, 113, 125]) {
        const profile = resizeSpineCrop(getArtworkCrop('spine', withDiscCount(albums[0], count)), percent)
        for (const area of [{ width: 9000, height: 9000 }, { width: 60, height: 600 }]) {
          const size = getCropOutputSize(area, profile)
          expect(Math.max(size.width, size.height)).toBeLessThanOrEqual(2048)
          expect(Math.abs(size.width - size.height * profile.width / profile.height)).toBeLessThanOrEqual(1)
        }
      }
    }
  })
})
