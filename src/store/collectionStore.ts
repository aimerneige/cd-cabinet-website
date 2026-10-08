import { create } from 'zustand'
import { albums } from '../data/albums'
import type { Album } from '../types/album'

interface CollectionState {
  albums: Album[]
  activeAlbumId: string | null
  editMode: boolean
  openAlbum: (id: string) => void
  closeAlbum: () => void
  toggleEdit: () => void
  reorderAlbum: (id: string, overId: string) => void
}

export const useCollection = create<CollectionState>((set) => ({
  albums,
  activeAlbumId: null,
  editMode: false,
  openAlbum: (id) => set({ activeAlbumId: id }),
  closeAlbum: () => set({ activeAlbumId: null }),
  toggleEdit: () => set((state) => ({ editMode: !state.editMode })),
  reorderAlbum: (id, overId) =>
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
    }),
}))
