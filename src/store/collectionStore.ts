import { create } from 'zustand'
import { albums } from '../data/albums'
import type { Album } from '../types/album'
import { loadCollection, saveCollection } from '../lib/collectionStorage'

interface CollectionState {
  albums: Album[]
  activeAlbumId: string | null
  editMode: boolean
  ready: boolean
  saving: boolean
  storageError: string | null
  loadFailed: boolean
  initialize: () => Promise<void>
  saveAlbum: (album: Album) => Promise<void>
  retrySave: () => Promise<void>
  openAlbum: (id: string) => void
  closeAlbum: () => void
  toggleEdit: () => void
  reorderAlbum: (id: string, overId: string) => void
}

let initialization: Promise<void> | null = null
let saveQueue: Promise<void> = Promise.resolve()

function persist(albums: Album[]): Promise<void> {
  useCollection.setState({ saving: true, storageError: null })
  const operation = saveQueue
    .catch(() => undefined)
    .then(() => saveCollection(albums))
  saveQueue = operation
  operation.then(
    () => {
      if (saveQueue === operation)
        useCollection.setState({ saving: false, storageError: null })
    },
    () => {
      if (saveQueue === operation)
        useCollection.setState({
          saving: false,
          storageError:
            'Your changes could not be saved in this browser. Free up storage and retry.',
        })
    },
  )
  return operation
}

export const useCollection = create<CollectionState>((set, get) => ({
  albums,
  activeAlbumId: null,
  editMode: false,
  ready: false,
  saving: false,
  storageError: null,
  loadFailed: false,
  initialize: () => {
    if (get().ready) return Promise.resolve()
    if (initialization) return initialization
    initialization = loadCollection()
      .then((saved) => {
        set({
          albums: saved ?? albums,
          ready: true,
          loadFailed: false,
          storageError: null,
        })
      })
      .catch(() => {
        set({
          ready: true,
          loadFailed: true,
          storageError:
            'Your saved collection could not be loaded. Browser storage may be unavailable.',
        })
      })
      .finally(() => {
        initialization = null
      })
    return initialization
  },
  saveAlbum: async (album) => {
    if (get().loadFailed)
      throw new Error('Load your saved collection before making changes.')
    const current = get().albums
    const next = current.some((item) => item.id === album.id)
      ? current.map((item) => (item.id === album.id ? album : item))
      : [...current, album]
    await persist(next)
    set({ albums: next })
  },
  retrySave: () => {
    if (get().loadFailed) {
      set({ ready: false })
      return get().initialize()
    }
    return persist(get().albums)
  },
  openAlbum: (id) => set({ activeAlbumId: id }),
  closeAlbum: () => set({ activeAlbumId: null }),
  toggleEdit: () => set((state) => ({ editMode: !state.editMode })),
  reorderAlbum: (id, overId) => {
    const previous = get().albums
    set((state) => {
      const source = state.albums.find((a) => a.id === id)
      const target = state.albums.find((a) => a.id === overId)
      if (
        !source ||
        !target ||
        id === overId ||
        source.shelfId !== target.shelfId
      )
        return state
      const shelf = state.albums
        .filter((a) => a.shelfId === source.shelfId)
        .sort((a, b) => a.order - b.order)
      const targetIndex = shelf.indexOf(target)
      shelf.splice(shelf.indexOf(source), 1)
      shelf.splice(targetIndex, 0, source)
      return {
        albums: state.albums.map((a) =>
          a.shelfId === source.shelfId
            ? { ...a, order: shelf.findIndex((item) => item.id === a.id) }
            : a,
        ),
      }
    })
    if (get().ready && !get().loadFailed && get().albums !== previous) {
      // 拖拽保持同步响应；保存失败通过页面状态提示，并允许重试。
      void persist(get().albums).catch(() => undefined)
    }
  },
}))
