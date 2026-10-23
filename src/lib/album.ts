import type { Album, AlbumDisc } from '../types/album'

export const MIN_SPINE_WIDTH_MM = 2
export const MAX_SPINE_WIDTH_MM = 40
export const SPINE_HEIGHT_MM = 118
// 纸张的 118 mm 对应 300 场景单位，盒体和内部纸张共用此换算比例。
export const CASE_WIDTH = 142 * 300 / SPINE_HEIGHT_MM
export const CASE_HEIGHT = 125 * 300 / SPINE_HEIGHT_MM

export function hasObi(album: Pick<Album, 'obiEnabled' | 'obiUrl'>): boolean {
  return album.obiEnabled ?? Boolean(album.obiUrl)
}

export function isSpineWidthMm(width: unknown): width is number {
  return typeof width === 'number' && Number.isFinite(width) && width >= MIN_SPINE_WIDTH_MM && width <= MAX_SPINE_WIDTH_MM
}

export function clampSpineWidthMm(width: number): number {
  return Math.max(MIN_SPINE_WIDTH_MM, Math.min(MAX_SPINE_WIDTH_MM, Math.round(width * 10) / 10))
}

export function getAlbumDiscs(album: Album): AlbumDisc[] {
  return album.discs?.length
    ? album.discs
    : [{ id: `${album.id}-disc-1`, tracks: album.tracks }]
}

export function getCaseDepth(album: Pick<Album, 'discs' | 'spineWidthMm'>): number {
  if (isSpineWidthMm(album.spineWidthMm)) return album.spineWidthMm * 300 / SPINE_HEIGHT_MM
  return (album.discs?.length || 1) <= 3 ? 24 : 58
}

export function withDiscCount(album: Album, count: number): Album {
  const previous = getAlbumDiscs(album)
  if (previous.length === count) return album
  const discs = resizeDiscs(previous, album.id, count)
  return { ...album, discs, tracks: discs.flatMap((disc) => disc.tracks) }
}

export function resizeDiscs(previous: AlbumDisc[], albumId: string, count: number): AlbumDisc[] {
  if (previous.length === count) return previous
  const discs = Array.from({ length: count }, (_, index) => ({
    ...previous[index],
    id: previous[index]?.id ?? `${albumId}-disc-${index + 1}`,
    tracks: previous[index]?.tracks ?? [],
  }))
  if (count < previous.length) {
    discs[count - 1] = {
      ...discs[count - 1],
      tracks: [
        ...discs[count - 1].tracks,
        ...previous.slice(count).flatMap((disc) => disc.tracks),
      ],
    }
  }
  return discs
}
