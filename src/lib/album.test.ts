import { describe, expect, it } from 'vitest'
import { albums } from '../data/albums'
import { getAlbumDiscs, getCaseDepth, getCaseThicknessMm, getSpineWidthMm, hasObi, SCENE_UNITS_PER_MM, withDiscCount } from './album'

describe('multi-disc albums', () => {
  it('shows OBI only when configured and honors explicit removal', () => {
    expect(hasObi({})).toBe(false)
    expect(hasObi({ obiEnabled: true })).toBe(true)
    expect(hasObi({ obiUrl: '/scan.png' })).toBe(true)
    expect(hasObi({ obiEnabled: false, obiUrl: '/scan.png' })).toBe(false)
  })
  it('uses standard flip cases for up to three discs and fatboxes for larger sets', () => {
    expect(getAlbumDiscs(albums[0])[0].tracks).toEqual(albums[0].tracks)
    expect(getAlbumDiscs(albums[2])).toHaveLength(2)
    expect(getCaseDepth(albums[2])).toBe(getCaseDepth(albums[0]))
    expect(getCaseThicknessMm(withDiscCount(albums[0], 3))).toBe(10.4)
    expect(getCaseThicknessMm(withDiscCount(albums[0], 4))).toBe(24)
    expect(getCaseThicknessMm(withDiscCount(albums[0], 6))).toBe(24)
  })

  it('adds empty discs without moving existing tracks', () => {
    const changed = withDiscCount(albums[0], 3)
    expect(changed.discs).toHaveLength(3)
    expect(changed.discs![0].tracks).toEqual(albums[0].tracks)
    expect(changed.discs![1].tracks).toEqual([])
    expect(changed.tracks).toEqual(albums[0].tracks)
  })

  it('keeps outer thickness independent of inner paper and preserves custom thickness across disc counts', () => {
    const album = { ...albums[0], spineWidthMm: 6.5, caseThicknessMm: 14 }
    expect(getCaseDepth(album)).toBeCloseTo(14 * SCENE_UNITS_PER_MM, 10)
    const narrowPaper = { ...album, spineWidthMm: 2 }
    expect(getCaseDepth(narrowPaper)).toBe(getCaseDepth(album))
    expect(getCaseDepth(withDiscCount(album, 6))).toBe(getCaseDepth(album))
    for (const caseThicknessMm of [undefined, 0, -1, 46, NaN, Infinity]) {
      expect(getCaseThicknessMm({ ...album, caseThicknessMm })).toBe(10.4)
      expect(getCaseThicknessMm({ ...withDiscCount(album, 4), caseThicknessMm })).toBe(24)
    }
    expect(getSpineWidthMm({})).toBe(6.5)
    expect(getSpineWidthMm(album)).toBe(6.5)
  })

  it('preserves every track when reducing the number of discs', () => {
    const before = getAlbumDiscs(albums[17])
    const changed = withDiscCount(albums[17], 2)
    expect(changed.discs).toHaveLength(2)
    expect(changed.discs![0].tracks).toEqual(before[0].tracks)
    expect(changed.discs![1].tracks).toEqual([
      ...before[1].tracks,
      ...before[2].tracks,
    ])
    expect(changed.tracks).toEqual(before.flatMap((disc) => disc.tracks))
  })
})
