import { describe, expect, it } from 'vitest'
import { albums } from '../data/albums'
import { withDiscCount } from './album'
import { getArtworkCrop, getCropOutputSize, type ArtworkKind } from './cropArtwork'

describe('artwork crop dimensions', () => {
  it('locks booklet, back insert and disc images to a square, with a circular disc guide', () => {
    const kinds: ArtworkKind[] = ['cover', 'bookletBack', 'back', 'backInside', 'disc', 'page']
    for (const kind of kinds) {
      expect(getArtworkCrop(kind, albums[0])).toEqual({ width: 1, height: 1, round: kind === 'disc' })
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

  it('exports exact integer ratios and limits the longest edge to 2048 pixels', () => {
    for (const kind of ['cover', 'spine', 'obi'] as const) {
      const profile = getArtworkCrop(kind, withDiscCount(albums[0], 4))
      for (const area of [{ width: 6000, height: 6000 }, { width: 3, height: 10 }, { width: 143, height: 745 }]) {
        const size = getCropOutputSize(area, profile)
        expect(size.width / size.height).toBe(profile.width / profile.height)
        expect(Math.max(size.width, size.height)).toBeLessThanOrEqual(2048)
        expect(Math.min(size.width, size.height)).toBeGreaterThan(0)
      }
    }
    expect(getCropOutputSize({ width: 600, height: 600 }, getArtworkCrop('cover', albums[0]))).toEqual({ width: 600, height: 600 })
  })
})
