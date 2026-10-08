import { useEffect, useMemo, useRef, useState } from 'react'
import { useCollection } from './store/collectionStore'
import { Shelf } from './components/Shelf/Shelf'
import { ActiveCD } from './components/ActiveCD/ActiveCD'
import type { Origin } from './hooks/useAlbumAnimation'
import type { Album } from './types/album'
import { AlbumEditor } from './components/AlbumEditor/AlbumEditor'

export default function App() {
  const {
    albums,
    activeAlbumId,
    editMode,
    openAlbum,
    closeAlbum,
    toggleEdit,
    ready,
    saving,
    storageError,
    loadFailed,
    initialize,
    retrySave,
  } = useCollection()
  const [editor, setEditor] = useState<string | null>(null)
  const pendingEditor = useRef<string | null>(null)
  useEffect(() => {
    void initialize()
  }, [initialize])
  const [query, setQuery] = useState('')
  const [genre, setGenre] = useState('All recordings')
  const [sort, setSort] = useState('shelf')
  const [origin, setOrigin] = useState<Origin | null>(null)
  const shown = useMemo(
    () =>
      albums
        .filter(
          (a) =>
            `${a.title} ${a.artist}`
              .toLowerCase()
              .includes(query.toLowerCase()) &&
            (genre === 'All recordings' || a.genre === genre),
        )
        .sort((a, b) =>
          sort === 'artist'
            ? a.artist.localeCompare(b.artist)
            : sort === 'year'
              ? b.year - a.year
              : a.order - b.order,
        ),
    [albums, query, genre, sort],
  )
  const active = albums.find((a) => a.id === activeAlbumId)
  function handleOpen(album: Album, element: HTMLButtonElement) {
    if (activeAlbumId) return
    const rect = element.getBoundingClientRect()
    setOrigin({ x: rect.x, y: rect.y, width: rect.width, height: rect.height })
    openAlbum(album.id)
  }
  function handleEdit() {
    setQuery('')
    setGenre('All recordings')
    setSort('shelf')
    toggleEdit()
  }
  return (
    <>
      <header className="site-header">
        <a className="brand" href="./">
          <span className="brand-icon">◉</span> cd cabinet
          <span className="brand-dot">®</span>
        </a>
        <span className="header-note">A HOME FOR YOUR MUSIC</span>
        <span className="header-right">
          EST. 2025 <span className="tiny-disc">◎</span>
        </span>
      </header>
      <main>
        <section className="collection-heading">
          <div>
            <span className="eyebrow">THE PERSONAL ARCHIVE</span>
            <h1>
              Good music.
              <br />
              <em>Kept close.</em>
            </h1>
            <p>
              A collection of sounds, stories, and a few old favourites.
              <br />
              Pull one out. Stay a while.
            </p>
          </div>
          <div className="collection-count">
            <strong>{String(albums.length).padStart(2, '0')}</strong>
            <span>ALBUMS ON THE SHELF</span>
            <i>Every record has a story.</i>
          </div>
        </section>
        <div className="collection-toolbar">
          <div className="genre-tabs" aria-label="Filter by genre">
            {[
              'All recordings',
              'Indie Folk',
              'Alternative',
              'Ambient',
              'Jazz',
            ].map((item) => (
              <button
                disabled={editMode}
                key={item}
                className={genre === item ? 'selected' : ''}
                onClick={() => setGenre(item)}
              >
                {item}
                {item === 'All recordings' && <sup>{albums.length}</sup>}
              </button>
            ))}
          </div>
          <div className="toolbar-tools">
            <label className="search">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <circle cx="10" cy="10" r="6" />
                <path d="m15 15 5 5" />
              </svg>
              <input
                disabled={editMode}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find a recording"
                aria-label="Search albums and artists"
              />
            </label>
            <label className="sort-control">
              <span>Sort</span>
              <select
                disabled={editMode}
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                aria-label="Sort recordings"
              >
                <option value="shelf">Shelf order</option>
                <option value="artist">Artist A–Z</option>
                <option value="year">Newest first</option>
              </select>
            </label>
            <button
              className={`edit-button ${editMode ? 'editing' : ''}`}
              onClick={handleEdit}
            >
              <span aria-hidden="true">{editMode ? '✓' : '↔'}</span>
              {editMode ? 'Done arranging' : 'Edit shelf'}
            </button>
          </div>
        </div>
        <div className="recording-actions">
          <button
            className="add-recording"
            disabled={!ready || loadFailed}
            onClick={() => setEditor('new')}
          >
            ＋ Add recording
          </button>
        </div>
        <div className="shelf-caption">
          <span>
            <i />
            {editMode ? 'ARRANGING YOUR COLLECTION' : 'YOUR COLLECTION'}
          </span>
          <span>
            {editMode
              ? 'Drag to reorder · use Space and arrow keys with a keyboard'
              : 'Hover to explore · click to open'}
          </span>
        </div>
        {ready ? (
          <Shelf albums={shown} onOpen={handleOpen} />
        ) : (
          <div className="cabinet empty-state" role="status">
            Loading your collection…
          </div>
        )}
        <div className="below-shelf">
          <span>
            <span className="tiny-disc">◎</span> A little less scrolling. A
            little more listening.
          </span>
          <span>
            {shown.length} of {albums.length} recordings <b>·</b>{' '}
            {new Set(albums.map((album) => album.shelfId)).size} shelves
          </span>
        </div>
        <div
          className="collection-storage-note"
          role={storageError ? 'alert' : 'status'}
        >
          <span>
            {storageError ??
              (saving ? 'Saving your collection…' : 'Saved in this browser.')}
          </span>
          {storageError && (
            <button
              disabled={saving}
              onClick={() => {
                void retrySave().catch(() => undefined)
              }}
            >
              Retry
            </button>
          )}
        </div>
        <footer>
          <span>For the love of physical music.</span>
          <span>
            YOUR MUSIC. YOUR LITTLE CORNER OF THE WORLD. <i>↗</i>
          </span>
        </footer>
      </main>
      {active && origin && (
        <ActiveCD
          key={active.id}
          album={active}
          origin={origin}
          onEdit={(id) => {
            pendingEditor.current = id
          }}
          onReturned={() => {
            closeAlbum()
            setOrigin(null)
            if (pendingEditor.current) {
              setEditor(pendingEditor.current)
              pendingEditor.current = null
            }
          }}
        />
      )}
      {editor && (
        <AlbumEditor
          key={editor}
          album={
            editor === 'new'
              ? undefined
              : albums.find((album) => album.id === editor)
          }
          onClose={() => {
            setEditor(null)
            setQuery('')
            setGenre('All recordings')
          }}
        />
      )}
    </>
  )
}
