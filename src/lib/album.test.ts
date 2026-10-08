import { describe, expect, it } from 'vitest'
import { albums } from '../data/albums'
import { getAlbumDiscs, getCaseDepth, withDiscCount } from './album'

describe('multi-disc albums', () => {
  it('uses standard flip cases for up to three discs and fatboxes for larger sets', () => {
    expect(getAlbumDiscs(albums[0])[0].tracks).toEqual(albums[0].tracks)
    expect(getAlbumDiscs(albums[2])).toHaveLength(2)
    expect(getCaseDepth(albums[2])).toBe(getCaseDepth(albums[0]))
    expect(getCaseDepth(withDiscCount(albums[0], 3))).toBe(24)
    expect(getCaseDepth(withDiscCount(albums[0], 4))).toBe(58)
    expect(getCaseDepth(withDiscCount(albums[0], 6))).toBe(58)
  })

  it('adds empty discs without moving existing tracks', () => {
    const changed = withDiscCount(albums[0], 3)
    expect(changed.discs).toHaveLength(3)
    expect(changed.discs![0].tracks).toEqual(albums[0].tracks)
    expect(changed.discs![1].tracks).toEqual([])
    expect(changed.tracks).toEqual(albums[0].tracks)
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
