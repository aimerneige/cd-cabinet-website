export interface Track {
  id: string
  title: string
  duration?: string
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
  color: string
  ink: string
  shelfId: string
  order: number
  tracks: Track[]
}
