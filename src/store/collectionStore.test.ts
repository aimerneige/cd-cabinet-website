import { beforeEach, describe, expect, it } from 'vitest'
import { useCollection } from './collectionStore'
import { albums } from '../data/albums'

beforeEach(() =>
  useCollection.setState({ albums, activeAlbumId: null, editMode: false }),
)

describe('collection ordering', () => {
  it('moves a later recording to an earlier slot and preserves the other shelf', () => {
    useCollection.getState().reorderAlbum('album-5', 'album-2')
    const state = useCollection.getState()
    const first = state.albums
      .filter((a) => a.shelfId === 'shelf-1')
      .sort((a, b) => a.order - b.order)
    expect(first.map((a) => a.id).slice(0, 6)).toEqual([
      'album-1',
      'album-5',
      'album-2',
      'album-3',
      'album-4',
      'album-6',
    ])
    expect(first.map((a) => a.order)).toEqual(
      Array.from({ length: 12 }, (_, i) => i),
    )
    expect(state.albums.filter((a) => a.shelfId === 'shelf-2')).toEqual(
      albums.filter((a) => a.shelfId === 'shelf-2'),
    )
  })

  it('moves an earlier recording into the later target slot', () => {
    useCollection.getState().reorderAlbum('album-2', 'album-5')
    const first = useCollection
      .getState()
      .albums.filter((a) => a.shelfId === 'shelf-1')
      .sort((a, b) => a.order - b.order)
    expect(first.map((a) => a.id).slice(0, 6)).toEqual([
      'album-1',
      'album-3',
      'album-4',
      'album-5',
      'album-2',
      'album-6',
    ])
  })

  it('ignores invalid, identical and cross-shelf targets', () => {
    for (const target of ['missing', 'album-1', 'album-13'])
      useCollection.getState().reorderAlbum('album-1', target)
    expect(useCollection.getState().albums).toEqual(albums)
  })
})
