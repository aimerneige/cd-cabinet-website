import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import type { Album, AlbumDisc, ArtworkPalette, ArtworkTheme, BookletFormat, BookletPage, ObiDimensions, Track } from '../../types/album'
import { getAlbumDiscs, getCaseDepth, getCaseThicknessMm, getSpineWidthMm, hasObi, resizeDiscs, SPINE_HEIGHT_MM, STANDARD_CASE_DEPTH, STANDARD_CASE_THICKNESS_MM } from '../../lib/album'
import { readArtwork } from '../../lib/readArtwork'
import { readCoverPalette, type CoverPalette } from '../../lib/coverPalette'
import { DISC_FORMATS, getDiscFormat } from '../../lib/disc'
import { getArtworkCrop, type ArtworkCrop, type ArtworkCropResult, type ArtworkKind } from '../../lib/cropArtwork'
import { alignSpineArtwork } from '../../lib/spineArtwork'
import { artworkPalettes, artworkThemes, coverPaletteIds, generateCover, getCoverPalettes, getArtworkPalette, getBackCoverArtwork, getDiscArtwork, getGeneratedCoverStyle, getInnerArtwork, getObiArtwork, getSpineArtwork, randomCoverStyle } from '../../lib/generatedCover'
import { AUDIO_ACCEPT, readAudio } from '../../lib/audio'
import { useCollection } from '../../store/collectionStore'
import { useTranslation } from '../../i18n'
import { getGenreOptions } from '../../data/genres'
import { ArtworkInput } from './ArtworkInput'
import { BookletPagesEditor } from './BookletPagesEditor'
import { ObiSizeControls } from './ObiSizeControls'
import { ArtworkCropper } from './ArtworkCropper'
import { ArtworkAlert } from './ArtworkAlert'
import { DeleteAlbumDialog } from './DeleteAlbumDialog'
import { UnsavedChangesDialog } from './UnsavedChangesDialog'
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
  const initialScrollY = useRef(window.scrollY)
  const returnFrame = useRef<number | null>(null)
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
  const caseThicknessMm = STANDARD_CASE_THICKNESS_MM
  const caseDepth = getCaseDepth({ discs, caseThicknessMm })
  const [editingDisc, setEditingDisc] = useState(0)
  const [coverStyle, setCoverStyle] = useState(
    () => album ? getGeneratedCoverStyle(album.coverUrl) : randomCoverStyle(),
  )
  const [cover, setCover] = useState(coverStyle ? '' : album?.coverUrl ?? '')
  const [coverPalette, setCoverPalette] = useState<CoverPalette | null>(null)
  const [artworkPalette, setArtworkPalette] = useState<ArtworkPalette | undefined>(album?.artworkPalette)
  const [artworkTheme, setArtworkTheme] = useState<ArtworkTheme | undefined>(album?.artworkTheme)
  const [spine, setSpine] = useState(album?.spineUrl ?? '')
  const [backCover, setBackCover] = useState(album?.backCoverUrl ?? '')
  const [bookletBack, setBookletBack] = useState(album?.bookletBackUrl ?? '')
  const [backInside, setBackInside] = useState(album?.backInsideUrl ?? '')
  const [rightSpine, setRightSpine] = useState(album?.rightSpineUrl ?? '')
  const [bookletPages, setBookletPages] = useState<BookletPage[]>(album?.bookletPages ?? [])
  const [bookletFormat, setBookletFormat] = useState<BookletFormat>(album?.bookletFormat ?? 'booklet')
  const [obi, setObi] = useState(album?.obiUrl ?? '')
  const [obiEnabled, setObiEnabled] = useState(album ? hasObi(album) : false)
  const [obiDimensions, setObiDimensions] = useState<ObiDimensions | undefined>(album?.obiDimensions)
  const [error, setError] = useState('')
  const [artworkAlert, setArtworkAlert] = useState<{ message: string; returnFocus: HTMLElement | null } | null>(null)
  const [loading, setLoading] = useState(false)
  const [readingAudio, setReadingAudio] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const pendingUploads = useRef(0)
  const cropSequence = useRef(0)
  const cropResolver = useRef<((result: ArtworkCropResult | null) => void) | null>(null)
  const [cropRequest, setCropRequest] = useState<{ id: number; source: string; profile: ArtworkCrop; resizeWidth: boolean; obi?: Pick<Album, 'discs' | 'caseThicknessMm' | 'obiDimensions'>; name: string; current: number; total: number } | null>(null)
  const alive = useRef(true)
  const saveAlbum = useCollection((state) => state.saveAlbum)
  const deleteAlbum = useCollection((state) => state.deleteAlbum)
  // 封面取色只对上传的封面有效；旧专辑没有记录时，选择封面配色会重新取色。
  const coverSwatches = cover ? coverPalette?.swatches ?? (cover === album?.coverUrl ? album?.coverSwatches : undefined) : undefined
  const coverPalettes = getCoverPalettes(coverSwatches)
  const selectedPalette = getArtworkPalette(artworkPalette, coverSwatches)
  const artworkDetails = {
    title: title.trim() || t('editor.albumTitle'),
    artist: artist.trim() || t('editor.artist'),
    year: Number(year),
    genre: genreValue,
    color: selectedPalette?.color ?? (cover ? coverPalette?.color : undefined) ?? coverStyle?.color ?? album?.color ?? '#7a8273',
    ink: selectedPalette?.ink ?? (cover ? coverPalette?.ink : undefined) ?? coverStyle?.ink ?? album?.ink ?? '#f0eadb',
    tracks: discs.flatMap((disc) => disc.tracks),
    discs,
    spineWidthMm,
    caseThicknessMm,
    obiDimensions,
    artworkPalette,
    artworkTheme,
    coverSwatches,
  }
  const generatedStyle = coverStyle ? {
    id: artworkTheme ?? coverStyle.id,
    color: artworkDetails.color,
    ink: artworkDetails.ink,
    accent: selectedPalette?.accent ?? coverStyle.accent,
  } : null
  const coverUrl = cover || (generatedStyle ? generateCover(artworkDetails, generatedStyle) : '')
  const previewAlbum = { ...artworkDetails, coverUrl, bookletBackUrl: bookletBack, backInsideUrl: backInside, spineUrl: spine, rightSpineUrl: rightSpine, backCoverUrl: backCover, obiUrl: obi }
  const draftValues = [title, artists, year, genre, customGenre, discs, spineWidthMm, coverStyle, cover, coverPalette, artworkPalette, artworkTheme, spine, backCover, bookletBack, backInside, rightSpine, bookletPages, bookletFormat, obi, obiEnabled, obiDimensions]
  const initialDraft = useRef(draftValues)
  // 比较不可变状态的引用，避免每次输入都重新序列化高清图片和音频。
  const dirty = draftValues.some((value, index) => !Object.is(value, initialDraft.current[index]))

  function requestClose() {
    if (saving || loading) return
    if (dirty) setConfirmLeave(true)
    else onClose()
  }

  useEffect(() => {
    if (!dirty && !loading) return
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [dirty, loading])

  useEffect(() => {
    alive.current = true
    if (returnFrame.current !== null) cancelAnimationFrame(returnFrame.current)
    const previous = album
      ? document.querySelector<HTMLButtonElement>(
          `[data-album-id="${album.id}"]`,
        )
      : document.querySelector<HTMLButtonElement>('.add-recording')
    const scrollY = initialScrollY.current
    window.scrollTo(0, 0)
    return () => {
      alive.current = false
      cropResolver.current?.(null)
      cropResolver.current = null
      returnFrame.current = requestAnimationFrame(() => {
        const target = previous?.isConnected ? previous : document.querySelector<HTMLButtonElement>('.add-recording')
        window.scrollTo(0, scrollY)
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
    const profile = getArtworkCrop(kind, { discs, spineWidthMm, caseThicknessMm, obiDimensions })
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
          setCropRequest({ id: ++cropSequence.current, source, profile, resizeWidth: kind === 'spine' || kind === 'rightSpine', obi: kind === 'obi' ? { discs, caseThicknessMm, obiDimensions } : undefined, name: files[index].name, current: index + 1, total: files.length })
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

  function upload(file: File | undefined, kind: Exclude<ArtworkKind, 'page'>, discId = discs[editingDisc].id) {
    if (!file) return
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
      if (kind === 'cover') {
        const palette = await readCoverPalette(source)
        if (!alive.current) return
        setCoverPalette(palette)
        setCover(source)
      } else if (kind === 'disc') {
        setDiscs((previous) => previous.map((disc) => disc.id === discId ? { ...disc, labelUrl: source } : disc))
      } else {
        const setters = { bookletBack: setBookletBack, back: setBackCover, backInside: setBackInside }
        setters[kind](source)
      }
    })
  }

  async function selectArtworkPalette(palette?: ArtworkPalette) {
    if (loading || saving) return
    const fromCover = !palette || (coverPaletteIds as readonly string[]).includes(palette)
    if (fromCover && cover && !coverPalette && (!palette || !coverSwatches)) {
      const returnFocus = document.activeElement as HTMLElement | null
      const previousPalette = artworkPalette
      setArtworkPalette(undefined)
      setLoading(true)
      try {
        const colors = await readCoverPalette(cover)
        if (!alive.current) return
        setCoverPalette(colors)
        setArtworkPalette(palette)
      } catch (cause) {
        if (alive.current) {
          setArtworkPalette(previousPalette)
          setArtworkAlert({ message: cause instanceof Error ? cause.message : t('artworkErrors.readFailed'), returnFocus })
        }
      } finally {
        if (alive.current) setLoading(false)
      }
      return
    }
    setArtworkPalette(palette)
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
    void readImages(files, 'page', async (results) => {
      const palette = await readCoverPalette(results[0].source)
      if (!alive.current) return
      setCoverPalette(palette)
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
            .reduce((units, item) => units + getCaseDepth(item) / STANDARD_CASE_DEPTH, 0) +
            caseDepth / STANDARD_CASE_DEPTH <=
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
        bookletFormat: bookletFormat === 'sheet' ? 'sheet' : undefined,
        backInsideUrl: backInside || undefined,
        rightSpineUrl: rightSpine || undefined,
        color: artworkDetails.color,
        ink: artworkDetails.ink,
        artworkPalette: (coverPaletteIds as readonly (string | undefined)[]).includes(artworkPalette) && !coverSwatches ? undefined : artworkPalette,
        artworkTheme,
        coverSwatches,
        backCoverUrl: backCover || undefined,
        obiUrl: obiEnabled ? obi || undefined : undefined,
        obiEnabled,
        obiDimensions: obiEnabled ? obiDimensions : undefined,
        spineUrl: spine || undefined,
        spineWidthMm,
        caseThicknessMm,
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
    <main
      className="album-editor"
      style={{ '--spine-ratio': getSpineWidthMm({ spineWidthMm }) / SPINE_HEIGHT_MM } as CSSProperties}
      aria-labelledby="editor-title"
      onKeyDown={(event) => event.stopPropagation()}
    >
      <form onSubmit={submit}>
        <div className="editor-heading">
          <div>
            <span className="eyebrow">{t('editor.eyebrow')}</span>
            <h1 id="editor-title">
              {album ? t('editor.editTitle') : t('editor.addTitle')}
            </h1>
          </div>
          <button
            type="button"
            onClick={requestClose}
            disabled={saving || loading}
          >
            <span aria-hidden="true">← </span>{t('editor.backToCollection')}
          </button>
        </div>
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
            <label>
              {t('editor.caseThickness')}
              <input type="number" aria-label={t('editor.caseThickness')} aria-describedby="case-thickness-guidance"
                disabled value={caseThicknessMm} />
              <small id="case-thickness-guidance">{t('editor.caseThicknessGuidance')}</small>
            </label>
          </div>
        </fieldset>
        <div className="random-cover-controls">
          <p>{t('editor.randomCoverGuidance')}</p>
          <button
            type="button"
            disabled={loading || saving}
            onClick={() => {
              setCoverStyle(randomCoverStyle(generatedStyle))
              setArtworkPalette(undefined)
              setArtworkTheme(undefined)
              setCoverPalette(null)
              setCover('')
              setError('')
            }}
          >
            {t('editor.randomCover')}
          </button>
        </div>
        <fieldset className="editor-design" disabled={loading || saving}>
          <legend>{t('artwork.design')}</legend>
          <p>{t('artwork.guidance')}</p>
          <div className="editor-design-groups">
            <fieldset className="editor-design-group">
              <legend>{t('artwork.palette')}</legend>
              <div className="editor-design-choices">
                <label className="editor-design-choice">
                  <input type="radio" name="artwork-palette" value="auto" checked={!artworkPalette} onChange={() => void selectArtworkPalette()} />
                  <span className="editor-palette-swatch editor-palette-auto" aria-hidden="true" />
                  <span>{t('artwork.palette.auto')}</span>
                </label>
                {artworkPalettes.map((palette) => (
                  <label className="editor-design-choice" key={palette.id}>
                    <input type="radio" name="artwork-palette" value={palette.id} checked={artworkPalette === palette.id} onChange={() => void selectArtworkPalette(palette.id)} />
                    <span className="editor-palette-swatch" aria-hidden="true" style={{ background: `linear-gradient(135deg, ${palette.color} 55%, ${palette.ink} 55% 75%, ${palette.accent} 75%)` }} />
                    <span>{t(`artwork.palette.${palette.id}`)}</span>
                  </label>
                ))}
                {coverPaletteIds.map((id) => {
                  const palette = coverPalettes.find((item) => item.id === id)
                  return (
                    <label className="editor-design-choice" key={id} title={cover ? undefined : t('artwork.palette.needsCover')}>
                      <input type="radio" name="artwork-palette" value={id} checked={artworkPalette === id} disabled={!cover} onChange={() => void selectArtworkPalette(id)} />
                      <span className={`editor-palette-swatch${palette ? '' : ' editor-palette-cover'}`} aria-hidden="true"
                        style={palette ? { background: `linear-gradient(135deg, ${palette.color} 55%, ${palette.ink} 55% 75%, ${palette.accent} 75%)` } : undefined} />
                      <span>{t(`artwork.palette.${id}`)}</span>
                    </label>
                  )
                })}
              </div>
            </fieldset>
            <fieldset className="editor-design-group">
              <legend>{t('artwork.theme')}</legend>
              <div className="editor-design-choices">
                <label className="editor-design-choice">
                  <input type="radio" name="artwork-theme" value="auto" checked={!artworkTheme} onChange={() => setArtworkTheme(undefined)} />
                  <span>{t('artwork.theme.auto')}</span>
                </label>
                {artworkThemes.map((theme) => (
                  <label className="editor-design-choice" key={theme}>
                    <input type="radio" name="artwork-theme" value={theme} checked={artworkTheme === theme} onChange={() => setArtworkTheme(theme)} />
                    <span>{t(`artwork.theme.${theme}`)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        </fieldset>
        <div className="editor-artwork">
          <div className="artwork-input">
            <ArtworkInput label={t('editor.coverArtwork')} src={coverUrl} alt={t('editor.coverPreviewAlt')} uploadLabel={t('editor.uploadCoverAria')}
              resetLabel={t('editor.useGeneratedCover')} custom={!!cover} disabled={loading || saving} onUpload={(file) => upload(file, 'cover')} onUploadMany={importBooklet}
              onReset={() => {
                setCover('')
                if (!coverStyle) setCoverStyle(randomCoverStyle())
                if ((coverPaletteIds as readonly (string | undefined)[]).includes(artworkPalette)) setArtworkPalette(undefined)
              }} />
            <p className="booklet-cover-guidance">{t('booklet.coverUploadGuidance')}</p>
          </div>
          <ArtworkInput label={t('editor.bookletBackArtwork')} src={getInnerArtwork(previewAlbum, 'booklet')} alt={t('editor.bookletBackPreview')}
            uploadLabel={t('editor.uploadBookletBack')} resetLabel={t('editor.useGeneratedBookletBack')} custom={!!bookletBack} disabled={loading || saving}
            onUpload={(file) => upload(file, 'bookletBack')} onReset={() => setBookletBack('')} />
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
          <div className="disc-artworks">
            {/* 每张光盘平铺显示，可分别设置类型和盘面。 */}
            {discs.map((disc, index) => {
              const multiple = discCount > 1
              const number = index + 1
              return (
                <div className="disc-artwork" key={disc.id}>
                  <label className="disc-format">
                    <span>{multiple ? t('editor.discNumberFormat', { number }) : t('editor.discFormat')}</span>
                    <select value={getDiscFormat(disc)} disabled={loading || saving}
                      onChange={(event) => setDiscs((previous) => previous.map((item) => item.id === disc.id
                        ? { ...item, format: event.target.value === 'cd' ? undefined : event.target.value as AlbumDisc['format'] } : item))}>
                      {DISC_FORMATS.map((format) => <option key={format} value={format}>{t(`disc.format.${format}`)}</option>)}
                    </select>
                  </label>
                  <ArtworkInput label={multiple ? t('editor.discNumberArtwork', { number }) : t('editor.discArtwork')} src={getDiscArtwork(previewAlbum, disc)}
                    alt={multiple ? t('editor.discNumberPreviewAlt', { number }) : t('editor.discPreviewAlt')}
                    uploadLabel={multiple ? t('editor.uploadDiscNumber', { number }) : t('editor.uploadDisc')}
                    resetLabel={multiple ? t('editor.useGeneratedDiscNumber', { number }) : t('editor.useGeneratedDisc')}
                    custom={!!disc.labelUrl} disabled={loading || saving} variant="disc"
                    onUpload={(file) => upload(file, 'disc', disc.id)}
                    onReset={() => setDiscs((previous) => previous.map((item) => item.id === disc.id ? { ...item, labelUrl: undefined } : item))} />
                </div>
              )
            })}
            <p className="obi-upload-guidance">{t('editor.discGuidance')}</p>
          </div>
          <div className="artwork-input">
            <label className="obi-toggle"><input type="checkbox" checked={obiEnabled} disabled={loading || saving} onChange={(event) => {
              setObiEnabled(event.target.checked)
              if (!event.target.checked) { setObi(''); setObiDimensions(undefined) }
            }} />{t('editor.includeObi')}</label>
            {obiEnabled && <><ArtworkInput label={t('editor.obiPaperStrip')} src={getObiArtwork(previewAlbum)} alt={t('editor.obiPreviewAlt')}
              uploadLabel={t('editor.uploadObiAria')} resetLabel={t('editor.useGeneratedObi')} custom={!!obi} disabled={loading || saving} variant="obi"
              onUpload={(file) => upload(file, 'obi')} onReset={() => setObi('')} />
            {obi && <button type="button" className="remove-spine" disabled={loading || saving} onClick={() => void recropObi()}>{t('obi.recrop')}</button>}
            {/* 生成的 OBI 直接在这里调尺寸；上传的扫描图尺寸跟随裁剪，需重新裁剪才能修改。 */}
            {obi
              ? <p className="obi-upload-guidance">{t('obi.scanSizeNote')}</p>
              : <ObiSizeControls dimensions={obiDimensions} thicknessMm={getCaseThicknessMm({ discs, caseThicknessMm })} disabled={loading || saving} onChange={setObiDimensions} />}
            <p className="obi-upload-guidance">{t('editor.obiUploadGuidance')}</p></>}
          </div>
        </div>
        <p className="upload-guidance">{t('editor.uploadGuidance')}</p>
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
        <BookletPagesEditor pages={bookletPages} format={bookletFormat} onFormatChange={setBookletFormat} onChange={setBookletPages} onUpload={uploadPages} onImport={importBooklet} disabled={loading || saving} />
        {error && (
          <p className="editor-error" role="alert">
            {error}
          </p>
        )}
        <div className="editor-footer">
          <span>{readingAudio ? t('editor.readingAudio') : loading ? t('editor.readingArtwork') : dirty || !album ? t('editor.unsavedNotice') : t('editor.savedNotice')}</span>
          <div>
            <button type="button" onClick={requestClose} disabled={saving || loading}>
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
      {confirmLeave && <UnsavedChangesDialog onKeepEditing={() => setConfirmLeave(false)} onDiscard={onClose} />}
      {confirmDelete && album && <DeleteAlbumDialog album={album} onCancel={() => setConfirmDelete(false)} onConfirm={async () => {
        await deleteAlbum(album.id)
        onDeleted(album.id)
        onClose()
      }} />}
      {cropRequest && <ArtworkCropper key={cropRequest.id} {...cropRequest} onComplete={finishCrop} />}
      {artworkAlert && <ArtworkAlert {...artworkAlert} onClose={() => setArtworkAlert(null)} />}
    </main>
  )
}
