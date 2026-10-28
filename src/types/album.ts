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
export type BookletFormat = 'booklet' | 'sheet'
export interface ObiDimensions {
  backWidthMm?: number
}
export type ArtworkTheme = 'dusk' | 'orbit' | 'arch' | 'waves' | 'tiles' | 'sunburst' | 'grid' | 'stripes' | 'bloom' | 'horizon' | 'monolith'
export type ArtworkPalette = 'cream' | 'clay' | 'forest' | 'ocean' | 'midnight' | 'mustard' | 'rose' | 'sage' | 'charcoal'
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
  /** 'booklet' 为骑马钉小册子（默认），'sheet' 为只有正反两面的单张插页。 */
  bookletFormat?: BookletFormat
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
