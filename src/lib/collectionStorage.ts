import type { Album } from '../types/album'

let database: Promise<IDBDatabase> | null = null
let storedArtwork = new Map<string, string>()

function openDatabase(): Promise<IDBDatabase> {
  if (database) return database
  database = new Promise<IDBDatabase>((resolve, reject) => {
    let blocked = false
    const request = indexedDB.open('cd-cabinet', 2)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('collection'))
        db.createObjectStore('collection')
      if (!db.objectStoreNames.contains('artwork'))
        db.createObjectStore('artwork', { keyPath: 'key' })
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
    albums: Album[] | null
    artwork: { key: string; url: string }[]
  }>((resolve, reject) => {
    const transaction = db.transaction(['collection', 'artwork'], 'readonly')
    const request = transaction.objectStore('collection').get('albums')
    const artwork = transaction.objectStore('artwork').getAll()
    transaction.oncomplete = () =>
      resolve({ albums: request.result ?? null, artwork: artwork.result })
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () =>
      reject(
        transaction.error ?? new Error('Collection loading was interrupted.'),
      )
  })
  storedArtwork = new Map(saved.artwork.map((item) => [item.key, item.url]))
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
      spineUrl: album.spineUrl ? restore(album.spineUrl) : undefined,
    })) ?? null
  )
}

export async function saveCollection(albums: Album[]): Promise<void> {
  const db = await openDatabase()
  const artwork = new Map<string, string>()
  function store(url: string, key: string): string {
    if (!url.startsWith('data:image/')) return url
    artwork.set(key, url)
    return `indexeddb:${key}`
  }
  const metadata = albums.map((album) => ({
    ...album,
    coverUrl: store(album.coverUrl, `${album.id}:cover`),
    spineUrl: album.spineUrl
      ? store(album.spineUrl, `${album.id}:spine`)
      : undefined,
  }))
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['collection', 'artwork'], 'readwrite')
    transaction.oncomplete = () => {
      storedArtwork = artwork
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
      transaction.objectStore('collection').put(metadata, 'albums')
    } catch (cause) {
      transaction.abort()
      reject(cause)
    }
  })
}
