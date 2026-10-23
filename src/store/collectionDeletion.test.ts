import { beforeEach, describe, expect, it, vi } from 'vitest'
import { albums } from '../data/albums'
import { saveCollection } from '../lib/collectionStorage'
import { useCollection } from './collectionStore'

vi.mock('../lib/collectionStorage', () => ({ loadCollection: vi.fn(), saveCollection: vi.fn() }))

beforeEach(() => {
  vi.mocked(saveCollection).mockReset().mockResolvedValue(undefined)
  useCollection.setState({ albums, activeAlbumId: null, editMode: false, ready: true, saving: false, loadFailed: false, storageError: null })
})

describe('deleting recordings', () => {
  it('removes the recording, closes it and renumbers only its shelf', async () => {
    useCollection.getState().openAlbum('album-2')
    await useCollection.getState().deleteAlbum('album-2')
    const state = useCollection.getState()
    expect(state.albums).toHaveLength(23)
    expect(state.albums.some((album) => album.id === 'album-2')).toBe(false)
    expect(state.activeAlbumId).toBeNull()
    const shelf = state.albums.filter((album) => album.shelfId === 'shelf-1')
    expect(shelf.map((album) => album.id)).toEqual(albums.filter((album) => album.shelfId === 'shelf-1' && album.id !== 'album-2').map((album) => album.id))
    expect(shelf.map((album) => album.order)).toEqual(Array.from({ length: 11 }, (_, index) => index))
    expect(state.albums.filter((album) => album.shelfId === 'shelf-2')).toEqual(albums.filter((album) => album.shelfId === 'shelf-2'))
    expect(saveCollection).toHaveBeenCalledExactlyOnceWith(state.albums)
  })

  it('waits for persistence before removing the recording', async () => {
    let finish!: () => void
    vi.mocked(saveCollection).mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve }))
    const operation = useCollection.getState().deleteAlbum('album-1')
    await vi.waitFor(() => expect(saveCollection).toHaveBeenCalledTimes(1))
    expect(useCollection.getState().albums).toBe(albums)
    expect(useCollection.getState().saving).toBe(true)
    finish()
    await operation
    expect(useCollection.getState().albums.some((album) => album.id === 'album-1')).toBe(false)
    expect(useCollection.getState().saving).toBe(false)
  })

  it('preserves the recording and active view when storage fails and allows a retry', async () => {
    useCollection.getState().openAlbum('album-1')
    vi.mocked(saveCollection).mockRejectedValueOnce(new Error('Storage full'))
    await expect(useCollection.getState().deleteAlbum('album-1')).rejects.toThrow('Storage full')
    expect(useCollection.getState().albums).toBe(albums)
    expect(useCollection.getState().activeAlbumId).toBe('album-1')
    expect(useCollection.getState().storageError).toContain('could not be saved')
    await useCollection.getState().deleteAlbum('album-1')
    expect(useCollection.getState().albums).toHaveLength(23)
    expect(useCollection.getState().storageError).toBeNull()
  })

  it('persists an empty collection when deleting its last recording', async () => {
    useCollection.setState({ albums: [albums[0]] })
    await useCollection.getState().deleteAlbum('album-1')
    expect(useCollection.getState().albums).toEqual([])
    expect(saveCollection).toHaveBeenCalledExactlyOnceWith([])
  })

  it('does not write for missing recordings or failed loads and keeps other views open', async () => {
    await useCollection.getState().deleteAlbum('missing')
    expect(saveCollection).not.toHaveBeenCalled()
    useCollection.setState({ loadFailed: true })
    await expect(useCollection.getState().deleteAlbum('album-1')).rejects.toThrow('Load your saved collection')
    expect(saveCollection).not.toHaveBeenCalled()
    useCollection.setState({ loadFailed: false, activeAlbumId: 'album-2' })
    await useCollection.getState().deleteAlbum('album-1')
    expect(useCollection.getState().activeAlbumId).toBe('album-2')
  })
})
