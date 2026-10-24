import { beforeEach, describe, expect, it, vi } from 'vitest'
import { albums as samples } from '../data/albums'
import { getCaseDepth } from '../lib/album'
import { saveCollection } from '../lib/collectionStorage'
import { isSampleAlbum } from '../lib/sampleAlbums'
import { useCollection } from './collectionStore'

vi.mock('../lib/collectionStorage', () => ({ loadCollection: vi.fn(), saveCollection: vi.fn() }))

const personal = { ...samples[0], id: 'personal', title: 'My recording', coverUrl: 'data:image/svg+xml,random-cover', order: 12 }

beforeEach(() => {
  vi.mocked(saveCollection).mockReset().mockResolvedValue(undefined)
  useCollection.setState({ albums: samples, activeAlbumId: null, ready: true, saving: false, loadFailed: false, storageError: null })
})

describe('sample collection actions', () => {
  it('identifies exact sample IDs without treating random artwork or similar IDs as samples', () => {
    expect(isSampleAlbum(samples[0])).toBe(true)
    expect(isSampleAlbum(personal)).toBe(false)
    expect(isSampleAlbum({ id: 'album-1-copy' })).toBe(false)
    expect(isSampleAlbum({ id: 'album-99' })).toBe(false)
  })

  it('clears samples in one write and retains the relative shelf order of personal recordings', async () => {
    const other = { ...personal, id: 'other', order: 7 }
    const secondShelf = { ...personal, id: 'second-shelf', shelfId: 'shelf-2', order: 8 }
    useCollection.setState({ albums: [...samples, personal, other, secondShelf], activeAlbumId: samples[0].id })
    await useCollection.getState().clearSampleAlbums()
    const state = useCollection.getState()
    expect(state.albums.map((album) => [album.id, album.order])).toEqual([['personal', 1], ['other', 0], ['second-shelf', 0]])
    expect(state.albums[0].coverUrl).toBe(personal.coverUrl)
    expect(state.activeAlbumId).toBeNull()
    expect(saveCollection).toHaveBeenCalledExactlyOnceWith(state.albums)
  })

  it('restores the original collection when empty and does not duplicate samples on repeat', async () => {
    useCollection.setState({ albums: [] })
    await useCollection.getState().restoreSampleAlbums()
    expect(useCollection.getState().albums).toEqual(samples)
    await useCollection.getState().restoreSampleAlbums()
    expect(saveCollection).toHaveBeenCalledTimes(1)
  })

  it('restores only missing samples and preserves existing edits and personal recordings', async () => {
    const edited = { ...samples[0], title: 'Edited sample', coverUrl: 'data:image/png,uploaded' }
    useCollection.setState({ albums: [edited, personal], activeAlbumId: personal.id })
    await useCollection.getState().restoreSampleAlbums()
    const state = useCollection.getState()
    expect(state.albums).toHaveLength(25)
    expect(state.albums.find((album) => album.id === edited.id)).toBe(edited)
    expect(state.albums.find((album) => album.id === personal.id)).toBe(personal)
    expect(new Set(state.albums.map((album) => album.id)).size).toBe(25)
    expect(new Set(state.albums.filter((album) => album.shelfId === 'shelf-1').map((album) => album.order)).size).toBe(13)
    expect(state.activeAlbumId).toBe(personal.id)
  })

  it('creates new sample shelves when the original shelves are full', async () => {
    const owned = Array.from({ length: 48 }, (_, index) => ({ ...personal, id: `owned-${index}`, shelfId: `shelf-${Math.floor(index / 24) + 1}`, order: index % 24 }))
    useCollection.setState({ albums: owned })
    await useCollection.getState().restoreSampleAlbums()
    const restored = useCollection.getState().albums
    expect(restored.slice(0, 48)).toEqual(owned)
    expect(new Set(restored.filter(isSampleAlbum).map((album) => album.shelfId))).toEqual(new Set(['shelf-3', 'shelf-4']))
    for (const shelfId of new Set(restored.map((album) => album.shelfId))) {
      expect(restored.filter((album) => album.shelfId === shelfId).reduce((total, album) => total + getCaseDepth(album) / 24, 0)).toBeLessThanOrEqual(24)
    }
  })

  it('preserves the collection and active disc when clearing fails and supports retry', async () => {
    const current = [...samples, personal]
    useCollection.setState({ albums: current, activeAlbumId: samples[0].id })
    vi.mocked(saveCollection).mockRejectedValueOnce(new Error('Storage full'))
    await expect(useCollection.getState().clearSampleAlbums()).rejects.toThrow('Storage full')
    expect(useCollection.getState().albums).toBe(current)
    expect(useCollection.getState().activeAlbumId).toBe(samples[0].id)
    await useCollection.getState().clearSampleAlbums()
    expect(useCollection.getState().albums.map((album) => album.id)).toEqual([personal.id])
  })

  it('keeps restoration atomic when storage fails', async () => {
    const current = [personal]
    useCollection.setState({ albums: current })
    vi.mocked(saveCollection).mockRejectedValueOnce(new Error('Storage full'))
    await expect(useCollection.getState().restoreSampleAlbums()).rejects.toThrow('Storage full')
    expect(useCollection.getState().albums).toBe(current)
    await useCollection.getState().restoreSampleAlbums()
    expect(useCollection.getState().albums).toHaveLength(25)
  })

  it('does not write for an already empty sample collection or a failed load', async () => {
    useCollection.setState({ albums: [personal], activeAlbumId: personal.id })
    await useCollection.getState().clearSampleAlbums()
    expect(useCollection.getState().activeAlbumId).toBe(personal.id)
    expect(saveCollection).not.toHaveBeenCalled()
    useCollection.setState({ loadFailed: true })
    await expect(useCollection.getState().clearSampleAlbums()).rejects.toThrow('Load your saved collection')
    await expect(useCollection.getState().restoreSampleAlbums()).rejects.toThrow('Load your saved collection')
    expect(saveCollection).not.toHaveBeenCalled()
  })
})
