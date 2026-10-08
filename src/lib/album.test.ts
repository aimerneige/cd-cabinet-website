import { describe, expect, it } from 'vitest'
import { albums } from '../data/albums'
import { getAlbumDiscs, getCaseDepth, withDiscCount } from './album'

describe('multi-disc albums', () => {
  it('keeps legacy single-disc albums usable and makes multi-disc cases thicker', () => {
    expect(getAlbumDiscs(albums[0])[0].tracks).toEqual(albums[0].tracks)
    expect(getAlbumDiscs(albums[2])).toHaveLength(2)
    expect(getCaseDepth(albums[2])).toBeGreaterThan(getCaseDepth(albums[0]))
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
