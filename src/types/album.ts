export interface Track {
  id: string
  title: string
  duration?: string
  audio?: Blob
  audioName?: string
}
export interface AlbumDisc {
  id: string
  title?: string
  labelUrl?: string
  tracks: Track[]
}
export interface Album {
  id: string
  title: string
  artist: string
  year: number
  genre: string
  coverUrl: string
  backCoverUrl?: string
  spineUrl?: string
  obiUrl?: string
  color: string
  ink: string
  shelfId: string
  order: number
  tracks: Track[]
  discs?: AlbumDisc[]
}
