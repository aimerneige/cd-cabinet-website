import { albums as samples } from '../data/albums'
import type { Album } from '../types/album'
import { getCaseDepth, STANDARD_CASE_DEPTH } from './album'

const sampleIds = new Set(samples.map((album) => album.id))

export function isSampleAlbum(album: Pick<Album, 'id'>): boolean {
  return sampleIds.has(album.id)
}

export function withoutSampleAlbums(current: Album[]): Album[] {
  if (!current.some(isSampleAlbum)) return current
  const remaining = current.filter((album) => !isSampleAlbum(album))
  const nextOrder = new Map<string, number>()
  const positions = new Map<string, number>()
  for (const album of [...remaining].sort((a, b) => a.order - b.order)) {
    const order = nextOrder.get(album.shelfId) ?? 0
    positions.set(album.id, order)
    nextOrder.set(album.shelfId, order + 1)
  }
  return remaining.map((album) => ({ ...album, order: positions.get(album.id)! }))
}

export function withMissingSampleAlbums(current: Album[]): Album[] {
  const existingIds = new Set(current.map((album) => album.id))
  const missing = samples.filter((album) => !existingIds.has(album.id))
  if (!missing.length) return current
  const next = [...current]
  for (const originalShelf of new Set(missing.map((album) => album.shelfId))) {
    const additions = missing.filter((album) => album.shelfId === originalShelf)
    const existing = next.filter((album) => album.shelfId === originalShelf)
    const units = [...existing, ...additions].reduce((total, album) => total + getCaseDepth(album) / STANDARD_CASE_DEPTH, 0)
    const shelfId = units <= 24 ? originalShelf
      : `shelf-${Math.max(0, ...next.map((album) => Number(album.shelfId.split('-')[1]) || 0)) + 1}`
    let order = next.filter((album) => album.shelfId === shelfId).reduce((max, album) => Math.max(max, album.order), -1) + 1
    for (const album of additions) next.push({ ...album, shelfId, order: order++ })
  }
  return next
}
