import { useEffect, useMemo, useRef, useState } from 'react'
import { useCollection } from './store/collectionStore'
import { Shelf } from './components/Shelf/Shelf'
import { ActiveCD } from './components/ActiveCD/ActiveCD'
import type { Origin } from './hooks/useAlbumAnimation'
import type { Album } from './types/album'
import { AlbumEditor } from './components/AlbumEditor/AlbumEditor'
import { useTranslation } from './i18n'
import { LanguageSwitcher } from './components/LanguageSwitcher/LanguageSwitcher'

const GENRE_LIST = [
  { key: 'All recordings', labelKey: 'genres.all' as const },
  { key: 'Indie Folk', labelKey: 'genres.indieFolk' as const },
  { key: 'Alternative', labelKey: 'genres.alternative' as const },
  { key: 'Ambient', labelKey: 'genres.ambient' as const },
  { key: 'Jazz', labelKey: 'genres.jazz' as const },
]

export default function App() {
  const { t } = useTranslation()
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
  useEffect(() => {
    document.title = t('meta.title')
  }, [t])
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
  const storageErrorMessage = useMemo(() => {
    if (!storageError) return null
    if (storageError.includes('could not be saved')) return t('storage.saveFailed')
    if (storageError.includes('could not be loaded')) return t('storage.loadFailed')
    return storageError
  }, [storageError, t])

  return (
    <>
      <header className="site-header">
        <a className="brand" href="./">
          <span className="brand-icon">◉</span> {t('header.brand')}
          <span className="brand-dot">®</span>
        </a>
        <span className="header-note">{t('header.note')}</span>
        <div className="header-right">
          <LanguageSwitcher />
          <span>
            {t('header.est')} <span className="tiny-disc">◎</span>
          </span>
        </div>
      </header>
      <main>
        <section className="collection-heading">
          <div>
            <span className="eyebrow">{t('hero.eyebrow')}</span>
            <h1>
              {t('hero.titleLine1')}
              <br />
              <em>{t('hero.titleLine2')}</em>
            </h1>
            <p>
              {t('hero.subtitleLine1')}
              <br />
              {t('hero.subtitleLine2')}
            </p>
          </div>
          <div className="collection-count">
            <strong>{String(albums.length).padStart(2, '0')}</strong>
            <span>{t('hero.countLabel')}</span>
            <i>{t('hero.countQuote')}</i>
          </div>
        </section>
        <div className="collection-toolbar">
          <div className="genre-tabs" aria-label={t('toolbar.filterByGenre')}>
            {GENRE_LIST.map((item) => (
              <button
                disabled={editMode}
                key={item.key}
                className={genre === item.key ? 'selected' : ''}
                onClick={() => setGenre(item.key)}
              >
                {t(item.labelKey)}
                {item.key === 'All recordings' && <sup>{albums.length}</sup>}
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
                placeholder={t('toolbar.searchPlaceholder')}
                aria-label={t('toolbar.searchAria')}
              />
            </label>
            <label className="sort-control">
              <span>{t('toolbar.sortLabel')}</span>
              <select
                disabled={editMode}
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                aria-label={t('toolbar.sortAria')}
              >
                <option value="shelf">{t('toolbar.sortShelf')}</option>
                <option value="artist">{t('toolbar.sortArtist')}</option>
                <option value="year">{t('toolbar.sortYear')}</option>
              </select>
            </label>
            <button
              className={`edit-button ${editMode ? 'editing' : ''}`}
              onClick={handleEdit}
            >
              <span aria-hidden="true">{editMode ? '✓' : '↔'}</span>
              {editMode ? t('toolbar.doneArranging') : t('toolbar.editShelf')}
            </button>
          </div>
        </div>
        <div className="recording-actions">
          <button
            className="add-recording"
            disabled={!ready || loadFailed}
            onClick={() => setEditor('new')}
          >
            {t('toolbar.addRecording')}
          </button>
        </div>
        <div className="shelf-caption">
          <span>
            <i />
            {editMode ? t('shelf.arrangingTitle') : t('shelf.collectionTitle')}
          </span>
          <span>
            {editMode
              ? t('shelf.arrangingHelp')
              : t('shelf.viewingHelp')}
          </span>
        </div>
        {ready ? (
          <Shelf albums={shown} onOpen={handleOpen} />
        ) : (
          <div className="cabinet empty-state" role="status">
            {t('shelf.loading')}
          </div>
        )}
        <div className="below-shelf">
          <span>
            <span className="tiny-disc">◎</span> {t('shelf.belowSummary')}
          </span>
          <span>
            {t('shelf.recordingsCount', { shown: shown.length, total: albums.length })} <b>·</b>{' '}
            {t('shelf.shelvesCount', { count: new Set(albums.map((album) => album.shelfId)).size })}
          </span>
        </div>
        <div
          className="collection-storage-note"
          role={storageError ? 'alert' : 'status'}
        >
          <span>
            {storageErrorMessage ??
              (saving ? t('storage.saving') : t('storage.saved'))}
          </span>
          {storageError && (
            <button
              disabled={saving}
              onClick={() => {
                void retrySave().catch(() => undefined)
              }}
            >
              {t('storage.retry')}
            </button>
          )}
        </div>
        <footer>
          <span>{t('footer.tagline')}</span>
          <span>
            {t('footer.corner')} <i>↗</i>
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
