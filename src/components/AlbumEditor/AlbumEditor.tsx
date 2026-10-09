import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { Album, AlbumDisc, Track } from '../../types/album'
import { getAlbumDiscs, getCaseDepth, resizeDiscs } from '../../lib/album'
import { readArtwork } from '../../lib/readArtwork'
import { AUDIO_ACCEPT, readAudio } from '../../lib/audio'
import { useCollection } from '../../store/collectionStore'
import { useTranslation } from '../../i18n'
import './AlbumEditor.css'

export function AlbumEditor({
  album,
  onClose,
}: {
  album?: Album
  onClose: () => void
}) {
  const { t } = useTranslation()
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
  const [discs, setDiscs] = useState<AlbumDisc[]>(
    () => album ? getAlbumDiscs(album) : [{ id: `${draftId}-disc-1`, tracks: [] }],
  )
  const discCount = discs.length
  const [editingDisc, setEditingDisc] = useState(0)
  const [cover, setCover] = useState(album?.coverUrl ?? '')
  const [spine, setSpine] = useState(album?.spineUrl ?? '')
  const [backCover, setBackCover] = useState(album?.backCoverUrl ?? '')
  const [obi, setObi] = useState(album?.obiUrl ?? '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [readingAudio, setReadingAudio] = useState(false)
  const [saving, setSaving] = useState(false)
  const pendingUploads = useRef(0)
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
    pendingUploads.current += 1
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
            : t('artworkErrors.readFailed'),
        )
    } finally {
      pendingUploads.current -= 1
      if (alive.current) setLoading(pendingUploads.current > 0)
    }
  }

  async function uploadAudio(files: File[], trackId?: string) {
    if (!files.length || loading || saving) return
    const discId = discs[editingDisc].id
    pendingUploads.current += 1
    setLoading(true)
    setReadingAudio(true)
    setError('')
    let fileName = ''
    try {
      const tracks: Track[] = []
      // 顺序校验限制解码资源占用；整批成功后才更新草稿。
      for (const file of files) {
        fileName = file.name
        const result = await readAudio(file)
        if (!alive.current) return
        tracks.push({
          id: crypto.randomUUID?.() ?? `track-${crypto.getRandomValues(new Uint32Array(2)).join('-')}`,
          title: file.name.replace(/\.[^.]+$/, ''),
          ...result,
        })
      }
      setDiscs((previous) => previous.map((disc) => disc.id === discId ? {
        ...disc,
        tracks: trackId
          ? disc.tracks.map((track) => track.id === trackId ? {
            ...track, audio: tracks[0].audio, audioName: tracks[0].audioName, duration: tracks[0].duration,
          } : track)
          : [...disc.tracks, ...tracks],
      } : disc))
    } catch (cause) {
      if (alive.current) setError(`${fileName}: ${cause instanceof Error ? cause.message : t('audioErrors.decodeFailed')}`)
    } finally {
      pendingUploads.current -= 1
      if (alive.current) {
        setLoading(pendingUploads.current > 0)
        setReadingAudio(false)
      }
    }
  }

  function updateTrack(id: string, changes: Partial<Track>) {
    setDiscs((previous) => previous.map((disc, index) => index === editingDisc ? {
      ...disc, tracks: disc.tracks.map((track) => track.id === id ? { ...track, ...changes } : track),
    } : disc))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving || loading) return
    if (!cover) {
      setError(t('editor.errorMissingCover'))
      return
    }
    if (!title.trim() || !artist.trim()) {
      setError(t('editor.errorMissingFields'))
      return
    }
    if (discs.some((disc) => disc.tracks.some((track) => !track.title.trim()))) {
      setError(t('editor.errorMissingTrackTitle'))
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
      const savedDiscs = discs.map((disc) => ({
        ...disc, tracks: disc.tracks.map((track) => ({ ...track, title: track.title.trim() })),
      }))
      await saveAlbum({
        ...base,
        title: title.trim(),
        artist: artist.trim(),
        year: Number(year),
        genre,
        coverUrl: cover,
        backCoverUrl: backCover || undefined,
        obiUrl: obi || undefined,
        spineUrl: spine || undefined,
        discs: savedDiscs,
        tracks: savedDiscs.flatMap((disc) => disc.tracks),
      })
      onClose()
    } catch {
      setError(t('editor.errorSaveFailed'))
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
            <span className="eyebrow">{t('editor.eyebrow')}</span>
            <h2 id="editor-title">
              {album ? t('editor.editTitle') : t('editor.addTitle')}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label={t('editor.closeAria')}
          >
            ×
          </button>
        </div>
        <div className="editor-artwork">
          <label className="artwork-upload">
            <span>{t('editor.coverArtwork')}</span>
            <div className="cover-preview">
              {cover ? (
                <img src={cover} alt={t('editor.coverPreviewAlt')} />
              ) : (
                <span>
                  ＋<small>{t('editor.chooseCover')}</small>
                </span>
              )}
            </div>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-label={t('editor.uploadCoverAria')}
              disabled={loading || saving}
              onChange={(event) => {
                void upload(event.target.files?.[0], 'cover')
                event.target.value = ''
              }}
            />
            <small>{t('editor.chooseImage')}</small>
          </label>
          <div className="spine-upload">
            <label className="artwork-upload">
              <span>
                {t('editor.spineArtwork')} <small>{t('editor.optional')}</small>
              </span>
              <div className="spine-preview">
                {spine ? (
                  <img src={spine} alt={t('editor.spinePreviewAlt')} />
                ) : (
                  <span>{t('editor.spinePlaceholder')}</span>
                )}
              </div>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-label={t('editor.uploadSpineAria')}
                disabled={loading || saving}
                onChange={(event) => {
                  void upload(event.target.files?.[0], 'spine')
                  event.target.value = ''
                }}
              />
              <small>{t('editor.chooseImage')}</small>
            </label>
            {spine && (
              <button
                type="button"
                className="remove-spine"
                disabled={loading || saving}
                onClick={() => setSpine('')}
              >
                {t('editor.useGeneratedSpine')}
              </button>
            )}
            <p>{t('editor.spineGuidance')}</p>
          </div>
        </div>
        <div className="extra-artwork">
          <div className="back-cover-upload">
            <label className="artwork-upload">
              <span>
                {t('editor.backCoverArtwork')} <small>{t('editor.optional')}</small>
              </span>
              <div className="cover-preview">
                {backCover ? (
                  <img src={backCover} alt={t('editor.backCoverPreviewAlt')} />
                ) : (
                  <span>
                    ＋<small>{t('editor.chooseBackCover')}</small>
                  </span>
                )}
              </div>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-label={t('editor.uploadBackCoverAria')}
                disabled={loading || saving}
                onChange={(event) => {
                  void upload(event.target.files?.[0], 'back')
                  event.target.value = ''
                }}
              />
              <small>{t('editor.chooseImage')}</small>
            </label>
            {backCover && (
              <button
                type="button"
                className="remove-spine"
                disabled={loading || saving}
                onClick={() => setBackCover('')}
              >
                {t('editor.useGeneratedBackCover')}
              </button>
            )}
          </div>
          <div className="back-cover-upload">
            <label className="artwork-upload">
              <span>
                {t('editor.obiPaperStrip')} <small>{t('editor.optional')}</small>
              </span>
              <div className="cover-preview obi-preview">
                {obi ? (
                  <img src={obi} alt={t('editor.obiPreviewAlt')} />
                ) : (
                  <span>
                    ＋<small>{t('editor.chooseObi')}</small>
                  </span>
                )}
              </div>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-label={t('editor.uploadObiAria')}
                disabled={loading || saving}
                onChange={(event) => {
                  void upload(event.target.files?.[0], 'obi')
                  event.target.value = ''
                }}
              />
              <small>{t('editor.chooseImage')}</small>
            </label>
            {obi && (
              <button
                type="button"
                className="remove-spine"
                disabled={loading || saving}
                onClick={() => setObi('')}
              >
                {t('editor.useGeneratedObi')}
              </button>
            )}
            <p className="obi-upload-guidance">{t('editor.obiUploadGuidance')}</p>
          </div>
        </div>
        <p className="upload-guidance">{t('editor.uploadGuidance')}</p>
        <fieldset disabled={saving || loading}>
          <div className="editor-fields">
            <label>
              {t('editor.albumTitle')}
              <input
                required
                maxLength={100}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
            <label>
              {t('editor.artist')}
              <input
                required
                maxLength={100}
                value={artist}
                onChange={(event) => setArtist(event.target.value)}
              />
            </label>
            <label>
              {t('editor.year')}
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
              {t('editor.genre')}
              <select
                value={genre}
                onChange={(event) => setGenre(event.target.value)}
              >
                {[
                  { key: 'Indie Folk', labelKey: 'genres.indieFolk' as const },
                  { key: 'Alternative', labelKey: 'genres.alternative' as const },
                  { key: 'Ambient', labelKey: 'genres.ambient' as const },
                  { key: 'Jazz', labelKey: 'genres.jazz' as const },
                  { key: 'Other', labelKey: 'genres.other' as const },
                ].map((item) => (
                  <option key={item.key} value={item.key}>
                    {t(item.labelKey)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('editor.numberOfDiscs')}
              <select
                value={discCount}
                onChange={(event) => {
                  const count = Number(event.target.value)
                  setDiscs((previous) => resizeDiscs(previous, draftId, count))
                  setEditingDisc((previous) => Math.min(previous, count - 1))
                }}
              >
                {[1, 2, 3, 4, 5, 6].map((count) => (
                  <option key={count} value={count}>
                    {count} {count === 1 ? t('editor.discSingle') : t('editor.discPlural')}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </fieldset>
        <fieldset className="editor-audio" disabled={loading || saving}>
          <legend>{t('editor.audioHeading')}</legend>
          {discs.length > 1 && (
            <div className="disc-selector" aria-label={t('viewer.chooseDiscAria')}>
              {discs.map((disc, index) => (
                <button key={disc.id} type="button" aria-pressed={editingDisc === index} onClick={() => setEditingDisc(index)}>
                  {t('viewer.discButton', { number: index + 1 })}
                </button>
              ))}
            </div>
          )}
          <label className="audio-upload">
            <span>＋ {t('editor.uploadAudio')}</span>
            <input
              type="file" accept={AUDIO_ACCEPT} multiple aria-label={t('editor.uploadAudio')}
              onChange={(event) => {
                void uploadAudio([...event.target.files ?? []])
                event.target.value = ''
              }}
            />
          </label>
          <p className="audio-guidance">{t('editor.audioGuidance')}</p>
          <ol className="editor-track-list">
            {discs[editingDisc].tracks.map((track, index) => (
              <li key={track.id}>
                <span className="track-number">{String(index + 1).padStart(2, '0')}</span>
                <div className="editor-track-info">
                  <input
                    required maxLength={100} value={track.title}
                    aria-label={t('editor.trackTitle', { number: index + 1 })}
                    onChange={(event) => updateTrack(track.id, { title: event.target.value })}
                  />
                  <small><span>{track.audioName ?? t('editor.noAudio')}</span><time>{track.duration}</time></small>
                </div>
                <div className="editor-track-actions">
                  <label className="audio-upload track-audio-upload" title={t('editor.replaceAudio', { title: track.title })}>
                    <span>↑ {t('editor.audioFile')}</span>
                    <input
                      type="file" accept={AUDIO_ACCEPT} aria-label={t('editor.replaceAudio', { title: track.title })}
                      onChange={(event) => {
                        void uploadAudio([...event.target.files ?? []], track.id)
                        event.target.value = ''
                      }}
                    />
                  </label>
                  {track.audio && (
                    <button type="button" className="remove-audio" aria-label={t('editor.removeAudio', { title: track.title })} onClick={() => updateTrack(track.id, { audio: undefined, audioName: undefined })}>×</button>
                  )}
                  <button
                    type="button" className="remove-track" aria-label={t('editor.removeTrack', { title: track.title })}
                    onClick={() => setDiscs((previous) => previous.map((disc, discIndex) => discIndex === editingDisc ? {
                      ...disc, tracks: disc.tracks.filter((item) => item.id !== track.id),
                    } : disc))}
                  >{t('editor.removeTrackAction')}</button>
                </div>
              </li>
            ))}
          </ol>
        </fieldset>
        {error && (
          <p className="editor-error" role="alert">
            {error}
          </p>
        )}
        <div className="editor-footer">
          <span>{readingAudio ? t('editor.readingAudio') : loading ? t('editor.readingArtwork') : t('editor.savedNotice')}</span>
          <div>
            <button type="button" onClick={onClose} disabled={saving}>
              {t('editor.cancel')}
            </button>
            <button
              type="submit"
              className="save-recording"
              disabled={loading || saving}
            >
              {saving
                ? t('editor.saving')
                : album
                  ? t('editor.saveChanges')
                  : t('editor.addRecording')}
            </button>
          </div>
        </div>
      </form>
    </dialog>
  )
}
