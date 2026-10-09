import type { Album, AlbumDisc, Track } from '../types/album'

type StoredTrack = Omit<Track, 'audio'> & { audioKey?: string }
type StoredAlbum = Omit<Album, 'tracks' | 'discs'> & {
  tracks: StoredTrack[]
  discs?: (Omit<AlbumDisc, 'tracks'> & { tracks: StoredTrack[] })[]
}

let database: Promise<IDBDatabase> | null = null
let storedArtwork = new Map<string, string>()
let storedAudio = new Map<string, Blob>()

function openDatabase(): Promise<IDBDatabase> {
  if (database) return database
  database = new Promise<IDBDatabase>((resolve, reject) => {
    let blocked = false
    const request = indexedDB.open('cd-cabinet', 3)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('collection'))
        db.createObjectStore('collection')
      if (!db.objectStoreNames.contains('artwork'))
        db.createObjectStore('artwork', { keyPath: 'key' })
      if (!db.objectStoreNames.contains('audio'))
        db.createObjectStore('audio', { keyPath: 'key' })
    }
    request.onsuccess = () => {
      const db = request.result
      if (blocked) {
        db.close()
        return
      }
      db.onversionchange = () => {
        db.close()
        database = null
      }
      resolve(db)
    }
    request.onerror = () => {
      database = null
      reject(request.error)
    }
    request.onblocked = () => {
      blocked = true
      database = null
      reject(new Error('Close other CD Cabinet tabs and try again.'))
    }
  }).catch((cause) => {
    database = null
    throw cause
  })
  return database
}

export async function loadCollection(): Promise<Album[] | null> {
  const db = await openDatabase()
  const saved = await new Promise<{
    albums: StoredAlbum[] | null
    artwork: { key: string; url: string }[]
    audio: { key: string; file: Blob }[]
  }>((resolve, reject) => {
    const transaction = db.transaction(['collection', 'artwork', 'audio'], 'readonly')
    const request = transaction.objectStore('collection').get('albums')
    const artwork = transaction.objectStore('artwork').getAll()
    const audio = transaction.objectStore('audio').getAll()
    transaction.oncomplete = () =>
      resolve({ albums: request.result ?? null, artwork: artwork.result, audio: audio.result })
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () =>
      reject(
        transaction.error ?? new Error('Collection loading was interrupted.'),
      )
  })
  storedArtwork = new Map(saved.artwork.map((item) => [item.key, item.url]))
  storedAudio = new Map(saved.audio.map((item) => [item.key, item.file]))
  function restoreTrack({ audioKey, ...track }: StoredTrack): Track {
    if (!audioKey) return track
    const audio = storedAudio.get(audioKey)
    if (!audio) throw new Error('Saved audio is missing. The collection was not modified.')
    return { ...track, audio }
  }
  function restore(url: string): string {
    if (!url.startsWith('indexeddb:')) return url
    const image = storedArtwork.get(url.slice('indexeddb:'.length))
    if (!image)
      throw new Error(
        'Saved artwork is missing. The collection was not modified.',
      )
    return image
  }
  return (
    saved.albums?.map((album) => ({
      ...album,
      coverUrl: restore(album.coverUrl),
      backCoverUrl: album.backCoverUrl
        ? restore(album.backCoverUrl)
        : undefined,
      spineUrl: album.spineUrl ? restore(album.spineUrl) : undefined,
      obiUrl: album.obiUrl ? restore(album.obiUrl) : undefined,
      tracks: album.tracks.map(restoreTrack),
      discs: album.discs?.map((disc) => ({ ...disc, tracks: disc.tracks.map(restoreTrack) })),
    })) ?? null
  )
}

export async function saveCollection(albums: Album[]): Promise<void> {
  const db = await openDatabase()
  const artwork = new Map<string, string>()
  const audio = new Map<string, Blob>()
  function storeTrack({ audio: file, ...track }: Track, albumId: string): StoredTrack {
    if (!file) return track
    const key = `${albumId}:${track.id}`
    audio.set(key, file)
    return { ...track, audioKey: key }
  }
  function store(url: string, key: string): string {
    if (!url.startsWith('data:image/')) return url
    artwork.set(key, url)
    return `indexeddb:${key}`
  }
  const metadata = albums.map((album) => ({
    ...album,
    coverUrl: store(album.coverUrl, `${album.id}:cover`),
    backCoverUrl: album.backCoverUrl
      ? store(album.backCoverUrl, `${album.id}:back`)
      : undefined,
    spineUrl: album.spineUrl
      ? store(album.spineUrl, `${album.id}:spine`)
      : undefined,
    obiUrl: album.obiUrl ? store(album.obiUrl, `${album.id}:obi`) : undefined,
    tracks: album.tracks.map((track) => storeTrack(track, album.id)),
    discs: album.discs?.map((disc) => ({
      ...disc, tracks: disc.tracks.map((track) => storeTrack(track, album.id)),
    })),
  }))
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['collection', 'artwork', 'audio'], 'readwrite')
    transaction.oncomplete = () => {
      storedArtwork = artwork
      storedAudio = audio
      resolve()
    }
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () =>
      reject(
        transaction.error ?? new Error('Collection saving was interrupted.'),
      )
    try {
      const images = transaction.objectStore('artwork')
      // 图片单独存储，拖拽排序时只更新元数据，避免重写全部高清封面。
      for (const [key, url] of artwork) {
        if (storedArtwork.get(key) !== url) images.put({ key, url })
      }
      for (const key of storedArtwork.keys()) {
        if (!artwork.has(key)) images.delete(key)
      }
      // 音频保留 Blob，排序和编辑文字时不重复写入大文件。
      const files = transaction.objectStore('audio')
      for (const [key, file] of audio) {
        if (storedAudio.get(key) !== file) files.put({ key, file })
      }
      for (const key of storedAudio.keys()) {
        if (!audio.has(key)) files.delete(key)
      }
      transaction.objectStore('collection').put(metadata, 'albums')
    } catch (cause) {
      transaction.abort()
      reject(cause)
    }
  })
}
