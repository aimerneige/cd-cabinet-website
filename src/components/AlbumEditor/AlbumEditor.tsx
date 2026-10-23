import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import type { Album, AlbumDisc, BookletPage, ObiDimensions, Track } from '../../types/album'
import { getAlbumDiscs, getCaseDepth, hasObi, resizeDiscs } from '../../lib/album'
import { readArtwork } from '../../lib/readArtwork'
import { getArtworkCrop, type ArtworkCrop, type ArtworkCropResult, type ArtworkKind } from '../../lib/cropArtwork'
import { alignSpineArtwork } from '../../lib/spineArtwork'
import { generateCover, getBackCoverArtwork, getDiscArtwork, getGeneratedCoverStyle, getInnerArtwork, getObiArtwork, getSpineArtwork, randomCoverStyle } from '../../lib/generatedCover'
import { AUDIO_ACCEPT, readAudio } from '../../lib/audio'
import { useCollection } from '../../store/collectionStore'
import { useTranslation } from '../../i18n'
import { getGenreOptions } from '../../data/genres'
import { ArtworkInput } from './ArtworkInput'
import { BookletPagesEditor } from './BookletPagesEditor'
import { ArtworkCropper } from './ArtworkCropper'
import { ArtworkAlert } from './ArtworkAlert'
import { DeleteAlbumDialog } from './DeleteAlbumDialog'
import './AlbumEditor.css'

export function AlbumEditor({
  album,
  onClose,
  onDeleted,
}: {
  album?: Album
  onClose: () => void
  onDeleted: (id: string) => void
}) {
  const { t } = useTranslation()
  const dialog = useRef<HTMLDialogElement>(null)
  const [draftId] = useState(
    () => album?.id ?? crypto.randomUUID?.() ??
      `album-${crypto.getRandomValues(new Uint32Array(2)).join('-')}`,
  )
  const [title, setTitle] = useState(album?.title ?? '')
  const [artists, setArtists] = useState(
    () => album?.artists?.length ? album.artists : [album?.artist ?? ''],
  )
  const artist = artists.map((name) => name.trim()).filter(Boolean).join(' / ')
  const [year, setYear] = useState(
    String(album?.year ?? new Date().getFullYear()),
  )
  const [genre, setGenre] = useState(album?.genre ?? 'Alternative')
  const [customGenre, setCustomGenre] = useState('')
  const collectionAlbums = useCollection((state) => state.albums)
  const genreOptions = getGenreOptions([
    ...collectionAlbums.map((item) => item.genre),
    ...(album ? [album.genre] : []),
  ])
  const customGenreName = customGenre.trim()
  const genreValue = genre || genreOptions.find((item) =>
    item.key.toLowerCase() === customGenreName.toLowerCase() ||
    (item.labelKey && t(item.labelKey).toLowerCase() === customGenreName.toLowerCase()),
  )?.key || customGenreName
  const [discs, setDiscs] = useState<AlbumDisc[]>(
    () => album ? getAlbumDiscs(album) : [{ id: `${draftId}-disc-1`, tracks: [] }],
  )
  const discCount = discs.length
  const [spineWidthMm, setSpineWidthMm] = useState(album?.spineWidthMm)
  const caseDepth = getCaseDepth({ discs, spineWidthMm })
  const [editingDisc, setEditingDisc] = useState(0)
  const [coverStyle, setCoverStyle] = useState(
    () => album ? getGeneratedCoverStyle(album.coverUrl) : randomCoverStyle(),
  )
  const [cover, setCover] = useState(coverStyle ? '' : album?.coverUrl ?? '')
  const [spine, setSpine] = useState(album?.spineUrl ?? '')
  const [backCover, setBackCover] = useState(album?.backCoverUrl ?? '')
  const [bookletBack, setBookletBack] = useState(album?.bookletBackUrl ?? '')
  const [backInside, setBackInside] = useState(album?.backInsideUrl ?? '')
  const [rightSpine, setRightSpine] = useState(album?.rightSpineUrl ?? '')
  const [bookletPages, setBookletPages] = useState<BookletPage[]>(album?.bookletPages ?? [])
  const [obi, setObi] = useState(album?.obiUrl ?? '')
  const [obiEnabled, setObiEnabled] = useState(album ? hasObi(album) : false)
  const [obiDimensions, setObiDimensions] = useState<ObiDimensions | undefined>(album?.obiDimensions)
  const [error, setError] = useState('')
  const [artworkAlert, setArtworkAlert] = useState<{ message: string; returnFocus: HTMLElement | null } | null>(null)
  const [loading, setLoading] = useState(false)
  const [readingAudio, setReadingAudio] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const pendingUploads = useRef(0)
  const cropSequence = useRef(0)
  const cropResolver = useRef<((result: ArtworkCropResult | null) => void) | null>(null)
  const [cropRequest, setCropRequest] = useState<{ id: number; source: string; profile: ArtworkCrop; resizeWidth: boolean; obi?: Pick<Album, 'discs' | 'spineWidthMm' | 'obiDimensions'>; name: string; current: number; total: number } | null>(null)
  const alive = useRef(true)
  const saveAlbum = useCollection((state) => state.saveAlbum)
  const deleteAlbum = useCollection((state) => state.deleteAlbum)
  const artworkDetails = {
    title: title.trim() || t('editor.albumTitle'),
    artist: artist.trim() || t('editor.artist'),
    year: Number(year),
    genre: genreValue,
    color: coverStyle?.color ?? album?.color ?? '#7a8273',
    ink: coverStyle?.ink ?? album?.ink ?? '#f0eadb',
    tracks: discs.flatMap((disc) => disc.tracks),
    discs,
    spineWidthMm,
    obiDimensions,
  }
  const coverUrl = cover || (coverStyle ? generateCover(artworkDetails, coverStyle) : '')
  const previewAlbum = { ...artworkDetails, coverUrl, bookletBackUrl: bookletBack, backInsideUrl: backInside, spineUrl: spine, rightSpineUrl: rightSpine, backCoverUrl: backCover, obiUrl: obi }

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
      cropResolver.current?.(null)
      cropResolver.current = null
      document.body.style.overflow = overflow
      requestAnimationFrame(() => {
        const target = previous?.isConnected ? previous : document.querySelector<HTMLButtonElement>('.add-recording')
        target?.focus({ preventScroll: true })
      })
    }
  }, [])

  function finishCrop(result: ArtworkCropResult | null) {
    const resolve = cropResolver.current
    cropResolver.current = null
    setCropRequest(null)
    resolve?.(result)
  }

  async function readImages(files: File[], kind: ArtworkKind, apply: (results: ArtworkCropResult[]) => void | Promise<void>) {
    if (!files.length || pendingUploads.current > 0 || saving) return
    const previous = document.activeElement as HTMLElement | null
    const profile = getArtworkCrop(kind, { discs, spineWidthMm, obiDimensions })
    pendingUploads.current += 1
    setLoading(true)
    setError('')
    try {
      const sources: string[] = []
      // 先验证整批文件，再逐张裁剪；取消或失败时不留下部分内页。
      for (const file of files) {
        sources.push(await readArtwork(file))
        if (!alive.current) return
      }
      const cropped: ArtworkCropResult[] = []
      for (const [index, source] of sources.entries()) {
        const result = await new Promise<ArtworkCropResult | null>((resolve) => {
          cropResolver.current = resolve
          setCropRequest({ id: ++cropSequence.current, source, profile, resizeWidth: kind === 'spine' || kind === 'rightSpine', obi: kind === 'obi' ? { discs, spineWidthMm, obiDimensions } : undefined, name: files[index].name, current: index + 1, total: files.length })
        })
        if (!result || !alive.current) return
        cropped.push(result)
      }
      if (alive.current) await apply(cropped)
    } catch (cause) {
      if (alive.current)
        setArtworkAlert({
          message: cause instanceof Error
            ? cause.message
            : t('artworkErrors.readFailed'),
          returnFocus: previous,
        })
    } finally {
      pendingUploads.current -= 1
      if (alive.current) {
        setLoading(pendingUploads.current > 0)
        requestAnimationFrame(() => previous?.focus({ preventScroll: true }))
      }
    }
  }

  function upload(file: File | undefined, kind: Exclude<ArtworkKind, 'page'>) {
    if (!file) return
    const discId = discs[editingDisc].id
    void readImages([file], kind, async ([result]) => {
      if (kind === 'spine' || kind === 'rightSpine') {
        const aligned = await alignSpineArtwork({ spineUrl: spine, rightSpineUrl: rightSpine, spineWidthMm }, kind === 'spine' ? 'left' : 'right', result)
        if (!alive.current) return
        setSpine(aligned.spineUrl ?? '')
        setRightSpine(aligned.rightSpineUrl ?? '')
        setSpineWidthMm(aligned.spineWidthMm)
        return
      }
      if (kind === 'obi') {
        setObi(result.source)
        setObiDimensions(result.obiDimensions)
        return
      }
      const source = result.source
      if (kind === 'disc') {
        setDiscs((previous) => previous.map((disc) => disc.id === discId ? { ...disc, labelUrl: source } : disc))
      } else {
        const setters = { cover: setCover, bookletBack: setBookletBack, back: setBackCover, backInside: setBackInside }
        setters[kind](source)
      }
    })
  }

  function uploadPages(files: File[]) {
    void readImages(files, 'page', (results) => setBookletPages((previous) => [...previous, ...results.map((result, index) => ({
      id: crypto.randomUUID?.() ?? `page-${crypto.getRandomValues(new Uint32Array(2)).join('-')}`, title: files[index].name.replace(/\.[^.]+$/, ''), text: '', imageUrl: result.source,
    }))]))
  }

  async function recropObi() {
    if (!obi || loading || saving) return
    const returnFocus = document.activeElement as HTMLElement | null
    setLoading(true)
    try {
      const blob = await (await fetch(obi)).blob()
      if (alive.current) upload(new File([blob], 'obi.png', { type: blob.type }), 'obi')
    } catch {
      if (alive.current) setArtworkAlert({ message: t('artworkErrors.readFailed'), returnFocus })
    } finally {
      if (alive.current) setLoading(pendingUploads.current > 0)
    }
  }

  function importBooklet(files: File[]) {
    if (!files.length || loading || saving) return
    if (files.length < 2) {
      setArtworkAlert({ message: t('booklet.needCovers'), returnFocus: document.activeElement as HTMLElement | null })
      return
    }
    void readImages(files, 'page', (results) => {
      setCover(results[0].source)
      setBookletBack(results[results.length - 1].source)
      setBookletPages(results.slice(1, -1).map((result, index) => ({
        id: crypto.randomUUID?.() ?? `page-${crypto.getRandomValues(new Uint32Array(2)).join('-')}`,
        title: files[index + 1].name.replace(/\.[^.]+$/, ''), text: '', imageUrl: result.source,
      })))
    })
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
    if (!coverUrl) {
      setError(t('editor.errorMissingCover'))
      return
    }
    if (!title.trim() || artists.some((name) => !name.trim())) {
      setError(t('editor.errorMissingFields'))
      return
    }
    if (!genreValue) {
      setError(t('editor.errorMissingGenre'))
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
            caseDepth / 24 <=
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
      coverUrl,
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
        artists: artists.map((name) => name.trim()),
        year: Number(year),
        genre: genreValue,
        coverUrl,
        bookletBackUrl: bookletBack || undefined,
        bookletPages: bookletPages.map((page) => ({ ...page, title: page.title.trim() })),
        backInsideUrl: backInside || undefined,
        rightSpineUrl: rightSpine || undefined,
        ...(coverStyle ? { color: coverStyle.color, ink: coverStyle.ink } : {}),
        backCoverUrl: backCover || undefined,
        obiUrl: obiEnabled ? obi || undefined : undefined,
        obiEnabled,
        obiDimensions: obiEnabled ? obiDimensions : undefined,
        spineUrl: spine || undefined,
        spineWidthMm,
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
      style={{ '--spine-preview-width': `${caseDepth / 2}px` } as CSSProperties}
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
        <div className="random-cover-controls">
          <p>{t('editor.randomCoverGuidance')}</p>
          <button
            type="button"
            disabled={loading || saving}
            onClick={() => {
              setCoverStyle(randomCoverStyle(coverStyle))
              setCover('')
              setError('')
            }}
          >
            {t('editor.randomCover')}
          </button>
        </div>
        <div className="editor-artwork">
          <ArtworkInput label={t('editor.coverArtwork')} src={coverUrl} alt={t('editor.coverPreviewAlt')} uploadLabel={t('editor.uploadCoverAria')}
            resetLabel={t('editor.useGeneratedCover')} custom={!!cover} disabled={loading || saving} onUpload={(file) => upload(file, 'cover')}
            onReset={() => { setCover(''); if (!coverStyle) setCoverStyle(randomCoverStyle()) }} />
          <ArtworkInput label={t('editor.bookletBackArtwork')} src={getInnerArtwork(previewAlbum, 'booklet')} alt={t('editor.bookletBackPreview')}
            uploadLabel={t('editor.uploadBookletBack')} resetLabel={t('editor.useGeneratedBookletBack')} custom={!!bookletBack} disabled={loading || saving}
            onUpload={(file) => upload(file, 'bookletBack')} onReset={() => setBookletBack('')} />
          <BookletPagesEditor pages={bookletPages} onChange={setBookletPages} onUpload={uploadPages} onImport={importBooklet} disabled={loading || saving} />
          <ArtworkInput label={t('editor.spineArtwork')} src={getSpineArtwork(previewAlbum, 'left')} alt={t('editor.spinePreviewAlt')}
            uploadLabel={t('editor.uploadSpineAria')} resetLabel={t('editor.useGeneratedSpine')} custom={!!spine} disabled={loading || saving} variant="spine"
            onUpload={(file) => upload(file, 'spine')} onReset={() => { setSpine(''); if (!rightSpine) setSpineWidthMm(undefined) }} />
          <ArtworkInput label={t('editor.rightSpineArtwork')} src={getSpineArtwork(previewAlbum, 'right')} alt={t('editor.rightSpinePreview')}
            uploadLabel={t('editor.uploadRightSpine')} resetLabel={t('editor.useGeneratedRightSpine')} custom={!!rightSpine} disabled={loading || saving} variant="spine"
            onUpload={(file) => upload(file, 'rightSpine')} onReset={() => { setRightSpine(''); if (!spine) setSpineWidthMm(undefined) }} />
          <ArtworkInput label={t('editor.backCoverArtwork')} src={getBackCoverArtwork(previewAlbum)} alt={t('editor.backCoverPreviewAlt')}
            uploadLabel={t('editor.uploadBackCoverAria')} resetLabel={t('editor.useGeneratedBackCover')} custom={!!backCover} disabled={loading || saving} variant="back"
            onUpload={(file) => upload(file, 'back')} onReset={() => setBackCover('')} />
          <ArtworkInput label={t('editor.backInsideArtwork')} src={getInnerArtwork(previewAlbum, 'back')} alt={t('editor.backInsidePreview')}
            uploadLabel={t('editor.uploadBackInside')} resetLabel={t('editor.useGeneratedBackInside')} custom={!!backInside} disabled={loading || saving} variant="back"
            onUpload={(file) => upload(file, 'backInside')} onReset={() => setBackInside('')} />
          <div className="disc-artwork">
            {discCount > 1 && <select aria-label={t('viewer.chooseDiscAria')} value={editingDisc} disabled={loading || saving} onChange={(event) => setEditingDisc(Number(event.target.value))}>
              {discs.map((disc, index) => <option key={disc.id} value={index}>{t('viewer.discButton', { number: index + 1 })}</option>)}
            </select>}
            <ArtworkInput label={t('editor.discArtwork')} src={getDiscArtwork(previewAlbum, discs[editingDisc])} alt={t('editor.discPreviewAlt')}
              uploadLabel={t('editor.uploadDisc')} resetLabel={t('editor.useGeneratedDisc')} custom={!!discs[editingDisc].labelUrl} disabled={loading || saving} variant="disc"
              onUpload={(file) => upload(file, 'disc')} onReset={() => setDiscs((previous) => previous.map((disc, index) => index === editingDisc ? { ...disc, labelUrl: undefined } : disc))} />
            <p className="obi-upload-guidance">{t('editor.discGuidance')}</p>
          </div>
          <div className="artwork-input">
            <label className="obi-toggle"><input type="checkbox" checked={obiEnabled} disabled={loading || saving} onChange={(event) => setObiEnabled(event.target.checked)} />{t('editor.includeObi')}</label>
            {obiEnabled && <><ArtworkInput label={t('editor.obiPaperStrip')} src={getObiArtwork(previewAlbum)} alt={t('editor.obiPreviewAlt')}
              uploadLabel={t('editor.uploadObiAria')} resetLabel={t('editor.useGeneratedObi')} custom={!!obi} disabled={loading || saving} variant="obi"
              onUpload={(file) => upload(file, 'obi')} onReset={() => setObi('')} />
            {obi && <button type="button" className="remove-spine" disabled={loading || saving} onClick={() => void recropObi()}>{t('obi.recrop')}</button>}
            <p className="obi-upload-guidance">{t('editor.obiUploadGuidance')}</p></>}
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
            <div className="editor-artists">
              {artists.map((name, index) => (
                <div className="editor-artist-row" key={index}>
                  <label>
                    {index === 0 ? t('editor.artist') : t('editor.artistNumber', { number: index + 1 })}
                    <input
                      required
                      maxLength={100}
                      value={name}
                      onChange={(event) => setArtists((previous) => previous.map((item, position) =>
                        position === index ? event.target.value : item,
                      ))}
                    />
                  </label>
                  {artists.length > 1 && (
                    <button
                      type="button"
                      className="editor-remove-artist"
                      aria-label={t('editor.removeArtist', { number: index + 1 })}
                      onClick={() => setArtists((previous) => previous.filter((_, position) => position !== index))}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button type="button" className="editor-add-option" onClick={() => setArtists((previous) => [...previous, ''])}>
                {t('editor.addArtist')}
              </button>
            </div>
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
            <div className="editor-genre">
              <label>
                {t('editor.genre')}
                <select value={genre} onChange={(event) => setGenre(event.target.value)}>
                  {genreOptions.map((item) => (
                    <option key={item.key} value={item.key}>
                      {item.labelKey ? t(item.labelKey) : item.key}
                    </option>
                  ))}
                  <option value="">{t('editor.customGenre')}</option>
                </select>
              </label>
              {genre ? (
                <button type="button" className="editor-add-option" onClick={() => setGenre('')}>
                  {t('editor.addGenre')}
                </button>
              ) : (
                <label className="editor-custom-genre">
                  {t('editor.customGenre')}
                  <input required maxLength={80} value={customGenre} onChange={(event) => setCustomGenre(event.target.value)} />
                </label>
              )}
            </div>
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
        {album && <button type="button" className="delete-recording" disabled={loading || readingAudio || saving} onClick={() => setConfirmDelete(true)}>{t('deleteAlbum.action')}</button>}
      </form>
      {confirmDelete && album && <DeleteAlbumDialog album={album} onCancel={() => setConfirmDelete(false)} onConfirm={async () => {
        await deleteAlbum(album.id)
        onDeleted(album.id)
        onClose()
      }} />}
      {cropRequest && <ArtworkCropper key={cropRequest.id} {...cropRequest} onComplete={finishCrop} />}
      {artworkAlert && <ArtworkAlert {...artworkAlert} onClose={() => setArtworkAlert(null)} />}
    </dialog>
  )
}
