import type { Album, AlbumDisc } from '../types/album'

export function getAlbumDiscs(album: Album): AlbumDisc[] {
  return album.discs?.length
    ? album.discs
    : [{ id: `${album.id}-disc-1`, tracks: album.tracks }]
}

export function getCaseDepth(album: Album): number {
  return 24 + Math.min(getAlbumDiscs(album).length - 1, 3) * 12
}

export function withDiscCount(album: Album, count: number): Album {
  const previous = getAlbumDiscs(album)
  if (previous.length === count) return album
  const discs = Array.from({ length: count }, (_, index) => ({
    ...previous[index],
    id: previous[index]?.id ?? `${album.id}-disc-${index + 1}`,
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
  return { ...album, discs, tracks: discs.flatMap((disc) => disc.tracks) }
}
