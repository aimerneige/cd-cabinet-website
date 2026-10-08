import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { Album } from '../../types/album'
import { getAlbumDiscs, getCaseDepth, withDiscCount } from '../../lib/album'
import { readArtwork } from '../../lib/readArtwork'
import { useCollection } from '../../store/collectionStore'
import './AlbumEditor.css'

export function AlbumEditor({
  album,
  onClose,
}: {
  album?: Album
  onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [draftId] = useState(
    () => album?.id ?? crypto.randomUUID?.() ??
      `album-${crypto.getRandomValues(new Uint32Array(2)).join('-')}`,
  )
  const [title, setTitle] = useState(album?.title ?? '')
  const [artist, setArtist] = useState(album?.artist ?? '')
  const [year, setYear] = useState(
    String(album?.year ?? new Date().getFullYear()),
  )
  const [genre, setGenre] = useState(album?.genre ?? 'Alternative')
  const [discCount, setDiscCount] = useState(
    album ? getAlbumDiscs(album).length : 1,
  )
  const [cover, setCover] = useState(album?.coverUrl ?? '')
  const [spine, setSpine] = useState(album?.spineUrl ?? '')
  const [backCover, setBackCover] = useState(album?.backCoverUrl ?? '')
  const [obi, setObi] = useState(album?.obiUrl ?? '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const imageLoads = useRef(0)
  const alive = useRef(true)
  const saveAlbum = useCollection((state) => state.saveAlbum)

  useEffect(() => {
    alive.current = true
    const previous = album
      ? document.querySelector<HTMLButtonElement>(
          `[data-album-id="${album.id}"]`,
        )
      : (document.activeElement as HTMLElement | null)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.current!.showModal()
    return () => {
      alive.current = false
      document.body.style.overflow = overflow
      requestAnimationFrame(() => previous?.focus({ preventScroll: true }))
    }
  }, [])

  async function upload(
    file: File | undefined,
    kind: 'cover' | 'spine' | 'back' | 'obi',
  ) {
    if (!file) return
    imageLoads.current += 1
    setLoading(true)
    setError('')
    try {
      const source = await readArtwork(file)
      if (alive.current) {
        const setArtwork =
          kind === 'cover'
            ? setCover
            : kind === 'back'
              ? setBackCover
              : kind === 'obi'
                ? setObi
                : setSpine
        setArtwork(source)
      }
    } catch (cause) {
      if (alive.current)
        setError(
          cause instanceof Error
            ? cause.message
            : 'The image could not be loaded.',
        )
    } finally {
      imageLoads.current -= 1
      if (alive.current) setLoading(imageLoads.current > 0)
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving || loading) return
    if (!cover) {
      setError('Upload a cover image to add this recording.')
      return
    }
    if (!title.trim() || !artist.trim()) {
      setError('Enter an album title and artist.')
      return
    }
    setSaving(true)
    setError('')
    const collection = useCollection.getState().albums
    const shelves = [...new Set(collection.map((item) => item.shelfId))]
    const shelfId =
      shelves.find(
        (id) =>
          collection
            .filter((item) => item.shelfId === id)
            .reduce((units, item) => units + getCaseDepth(item) / 24, 0) +
            1 +
            Math.min(discCount - 1, 3) * 0.5 <=
          24,
      ) ??
      `shelf-${Math.max(0, ...shelves.map((id) => Number(id.split('-')[1]) || 0)) + 1}`
    const base: Album = album ?? {
      id: draftId,
      title: '',
      artist: '',
      year: Number(year),
      genre,
      color: '#7a8273',
      ink: '#f0eadb',
      coverUrl: cover,
      shelfId,
      order:
        collection
          .filter((item) => item.shelfId === shelfId)
          .reduce((max, item) => Math.max(max, item.order), -1) + 1,
      tracks: [],
    }
    try {
      await saveAlbum(
        withDiscCount(
          {
            ...base,
            title: title.trim(),
            artist: artist.trim(),
            year: Number(year),
            genre,
            coverUrl: cover,
            backCoverUrl: backCover || undefined,
            obiUrl: obi || undefined,
            spineUrl: spine || undefined,
          },
          discCount,
        ),
      )
      onClose()
    } catch {
      setError(
        'The recording could not be saved. Please check browser storage and try again.',
      )
      setSaving(false)
    }
  }

  return (
    <dialog
      ref={dialog}
      className="album-editor"
      aria-labelledby="editor-title"
      onKeyDown={(event) => event.stopPropagation()}
      onCancel={(event) => {
        event.preventDefault()
        if (!saving) onClose()
      }}
    >
      <form onSubmit={submit}>
        <div className="editor-heading">
          <div>
            <span className="eyebrow">MAKE IT YOUR OWN</span>
            <h2 id="editor-title">
              {album ? 'Edit recording' : 'Add a recording'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close recording editor"
          >
            ×
          </button>
        </div>
        <div className="editor-artwork">
          <label className="artwork-upload">
            <span>Cover artwork</span>
            <div className="cover-preview">
              {cover ? (
                <img src={cover} alt="Cover preview" />
              ) : (
                <span>
                  ＋<small>Choose your cover</small>
                </span>
              )}
            </div>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-label="Upload cover artwork"
              disabled={loading || saving}
              onChange={(event) => {
                void upload(event.target.files?.[0], 'cover')
                event.target.value = ''
              }}
            />
            <small>Choose image</small>
          </label>
          <div className="spine-upload">
            <label className="artwork-upload">
              <span>
                Spine artwork <small>optional</small>
              </span>
              <div className="spine-preview">
                {spine ? (
                  <img src={spine} alt="Spine preview" />
                ) : (
                  <span>Artist · Album</span>
                )}
              </div>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-label="Upload spine artwork"
                disabled={loading || saving}
                onChange={(event) => {
                  void upload(event.target.files?.[0], 'spine')
                  event.target.value = ''
                }}
              />
              <small>Choose image</small>
            </label>
            {spine && (
              <button
                type="button"
                className="remove-spine"
                disabled={loading || saving}
                onClick={() => setSpine('')}
              >
                Use generated spine
              </button>
            )}
            <p>
              Use a tall, narrow image. Without one, we create the side label
              from your album details.
            </p>
          </div>
        </div>
        <div className="extra-artwork">
          <div className="back-cover-upload">
            <label className="artwork-upload">
              <span>
                Back cover artwork <small>optional</small>
              </span>
              <div className="cover-preview">
                {backCover ? (
                  <img src={backCover} alt="Back cover preview" />
                ) : (
                  <span>
                    ＋<small>Choose your back cover</small>
                  </span>
                )}
              </div>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-label="Upload back cover artwork"
                disabled={loading || saving}
                onChange={(event) => {
                  void upload(event.target.files?.[0], 'back')
                  event.target.value = ''
                }}
              />
              <small>Choose image</small>
            </label>
            {backCover && (
              <button
                type="button"
                className="remove-spine"
                disabled={loading || saving}
                onClick={() => setBackCover('')}
              >
                Use generated back cover
              </button>
            )}
          </div>
          <div className="back-cover-upload">
            <label className="artwork-upload">
              <span>
                OBI paper strip <small>optional</small>
              </span>
              <div className="cover-preview obi-preview">
                {obi ? (
                  <img src={obi} alt="OBI preview" />
                ) : (
                  <span>
                    ＋<small>Choose your paper strip</small>
                  </span>
                )}
              </div>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-label="Upload OBI paper strip"
                disabled={loading || saving}
                onChange={(event) => {
                  void upload(event.target.files?.[0], 'obi')
                  event.target.value = ''
                }}
              />
              <small>Choose image</small>
            </label>
            {obi && (
              <button
                type="button"
                className="remove-spine"
                disabled={loading || saving}
                onClick={() => setObi('')}
              >
                Use generated OBI
              </button>
            )}
            <p className="obi-upload-guidance">
              Upload the entire unfolded strip, with the back flap, spine and
              front flap from left to right.
            </p>
          </div>
        </div>
        <p className="upload-guidance">
          JPG, PNG or WebP · Up to 5 MB per image
        </p>
        <fieldset disabled={saving}>
          <div className="editor-fields">
            <label>
              Album title
              <input
                required
                maxLength={100}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
            <label>
              Artist
              <input
                required
                maxLength={100}
                value={artist}
                onChange={(event) => setArtist(event.target.value)}
              />
            </label>
            <label>
              Year
              <input
                type="number"
                required
                min={1900}
                max={2100}
                value={year}
                onChange={(event) => setYear(event.target.value)}
              />
            </label>
            <label>
              Genre
              <select
                value={genre}
                onChange={(event) => setGenre(event.target.value)}
              >
                {['Indie Folk', 'Alternative', 'Ambient', 'Jazz', 'Other'].map(
                  (item) => (
                    <option key={item}>{item}</option>
                  ),
                )}
              </select>
            </label>
            <label>
              Number of discs
              <select
                value={discCount}
                onChange={(event) => setDiscCount(Number(event.target.value))}
              >
                {[1, 2, 3, 4, 5, 6].map((count) => (
                  <option key={count} value={count}>
                    {count} {count === 1 ? 'disc' : 'discs'}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </fieldset>
        {error && (
          <p className="editor-error" role="alert">
            {error}
          </p>
        )}
        <div className="editor-footer">
          <span>{loading ? 'Reading artwork…' : 'Saved on this browser.'}</span>
          <div>
            <button type="button" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button
              type="submit"
              className="save-recording"
              disabled={loading || saving}
            >
              {saving ? 'Saving…' : album ? 'Save changes' : 'Add recording'}
            </button>
          </div>
        </div>
      </form>
    </dialog>
  )
}
