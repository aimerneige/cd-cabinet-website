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
export interface BookletPage {
  id: string
  title: string
  text: string
  imageUrl?: string
}
export interface ObiDimensions {
  backWidthMm?: number
}
export type ArtworkTheme = 'dusk' | 'orbit' | 'arch' | 'waves' | 'tiles'
export type ArtworkPalette = 'cream' | 'clay' | 'forest' | 'ocean' | 'midnight'
export interface Album {
  id: string
  title: string
  artist: string
  artists?: string[]
  year: number
  genre: string
  coverUrl: string
  bookletBackUrl?: string
  bookletPages?: BookletPage[]
  backCoverUrl?: string
  backInsideUrl?: string
  spineUrl?: string
  rightSpineUrl?: string
  spineWidthMm?: number
  caseThicknessMm?: number
  obiUrl?: string
  obiEnabled?: boolean
  obiDimensions?: ObiDimensions
  color: string
  ink: string
  artworkTheme?: ArtworkTheme
  artworkPalette?: ArtworkPalette
  shelfId: string
  order: number
  tracks: Track[]
  discs?: AlbumDisc[]
}
