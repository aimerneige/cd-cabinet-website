import { useEffect, useMemo, useRef, useState } from 'react'
import type { Album } from '../../types/album'
import { hasObi } from '../../lib/album'
import { getBookletLayout, getSpread, getSpreadIndex, getSpreadPages } from '../../lib/booklet'
import { getBackCoverArtwork, getInnerArtwork, getObiArtwork, getSpineArtwork } from '../../lib/generatedCover'
import { useTranslation } from '../../i18n'
import { BookView, SheetView, SinglePageView, type RenderPage } from './BookletViews'
import './ArtworkReader.css'

interface ReaderPage { id: string; title: string; imageUrl?: string; text: string }

const SPREAD_QUERY = '(min-width: 761px)'

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const media = window.matchMedia(query)
    const update = () => setMatches(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [query])
  return matches
}

export function ArtworkReader({ album, mode, onClose }: { album: Album; mode: 'booklet' | 'case'; onClose: () => void }) {
  const { t } = useTranslation()
  const dialog = useRef<HTMLDialogElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const thumbnails = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const format = mode === 'case' ? null : album.bookletFormat === 'sheet' ? 'sheet' : 'booklet'
  const wide = useMediaQuery(SPREAD_QUERY)
  const spreads = format === 'booklet' && wide
  const pages: ReaderPage[] = format === 'sheet' ? [
    { id: 'front', title: t('booklet.sheetFront'), imageUrl: album.coverUrl, text: '' },
    { id: 'back', title: t('booklet.sheetBack'), imageUrl: getInnerArtwork(album, 'booklet'), text: '' },
  ] : format === 'booklet' ? [
    { id: 'front', title: t('editor.coverArtwork'), imageUrl: album.coverUrl, text: '' },
    ...(album.bookletPages ?? []),
    { id: 'back', title: t('editor.bookletBackArtwork'), imageUrl: getInnerArtwork(album, 'booklet'), text: '' },
  ] : [
    { id: 'outer', title: t('editor.backCoverArtwork'), imageUrl: getBackCoverArtwork(album), text: '' },
    { id: 'inner', title: t('editor.backInsideArtwork'), imageUrl: getInnerArtwork(album, 'back'), text: '' },
    { id: 'left', title: t('editor.spineArtwork'), imageUrl: getSpineArtwork(album, 'left'), text: '' },
    { id: 'right', title: t('editor.rightSpineArtwork'), imageUrl: getSpineArtwork(album, 'right'), text: '' },
    ...(hasObi(album) ? [{ id: 'obi', title: t('editor.obiPaperStrip'), imageUrl: getObiArtwork(album), text: '' }] : []),
  ]
  const page = pages[index]
  const layout = useMemo(() => getBookletLayout(pages.length), [pages.length])
  const spread = getSpread(layout, index)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const element = dialog.current!
    element.showModal()
    return () => {
      element.close()
      requestAnimationFrame(() => previous?.focus({ preventScroll: true }))
    }
  }, [])
  useEffect(() => {
    // 翻到首页或末页时当前按钮会被禁用，把焦点交给另一个翻页按钮，方向键才能继续使用。
    const active = document.activeElement
    if (active === document.body || (active instanceof HTMLButtonElement && active.disabled && dialog.current?.contains(active)))
      dialog.current?.querySelector<HTMLButtonElement>('nav button:not(:disabled)')?.focus()
    stage.current?.querySelector('.reader-paper.is-current')?.scrollTo(0, 0)
    thumbnails.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [index])
  const atStart = spreads ? spread === 0 : index === 0
  const atEnd = spreads ? spread === layout.leaves : index === pages.length - 1
  function turn(direction: number) {
    if (spreads) setIndex(getSpreadIndex(layout, Math.max(0, Math.min(layout.leaves, spread + direction))))
    else setIndex((previous) => Math.max(0, Math.min(pages.length - 1, previous + direction)))
  }
  // 跨页模式下左右两页都可见，导航处显示可见的页码范围。
  const visible = spreads
    ? Object.values(getSpreadPages(layout, spread)).map((physical) => physical === undefined ? null : layout.physical[physical]).filter((item): item is number => item !== null && item !== undefined)
    : [index]
  const range = visible.length > 1 ? `${visible[0] + 1}–${visible[visible.length - 1] + 1}` : `${index + 1}`

  const renderPage: RenderPage = (number, shown) => {
    if (number === null) return <div className="reader-paper reader-blank" aria-hidden="true" inert><span>{t('booklet.blankPage')}</span></div>
    const item = pages[number]
    return (
      <div className={`reader-paper${item.imageUrl ? ' has-image' : ''}${item.text ? ' has-text' : ''}${number === index ? ' is-current' : ''}`}
        aria-hidden={!shown} inert={!shown}>
        {item.imageUrl && <img src={item.imageUrl} alt={item.title || t('booklet.pageNumber', { number: number + 1 })} />}
        {(!item.imageUrl || item.text) && <article><h3>{item.title}</h3><p>{item.text}</p></article>}
      </div>
    )
  }

  return (
    <dialog ref={dialog} className={`artwork-reader${format ? ` is-${format}` : ''}${spreads ? ' is-spread' : ''}`} aria-labelledby="artwork-reader-title"
      onClick={(event) => {
        const box = event.currentTarget.getBoundingClientRect()
        if (event.target === event.currentTarget && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) onClose()
      }}
      onCancel={(event) => { event.preventDefault(); onClose() }}
      onKeyDown={(event) => {
        event.stopPropagation()
        if (event.target instanceof HTMLSelectElement) return
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); turn(event.key === 'ArrowLeft' ? -1 : 1) }
      }}>
      <header>
        <div><span className="eyebrow">{album.artist}</span><h2 id="artwork-reader-title">{format === 'sheet' ? t('booklet.sheetHeading') : format ? t('booklet.heading') : t('booklet.caseArtwork')}</h2></div>
        <button type="button" onClick={onClose} aria-label={t('booklet.close')}>×</button>
      </header>
      <div ref={stage} className="reader-stage">
        {format === 'booklet' && spreads && <BookView count={pages.length} index={index} renderPage={renderPage} />}
        {format === 'booklet' && !spreads && <SinglePageView index={index} renderPage={renderPage} />}
        {format === 'sheet' && <SheetView index={index} renderPage={renderPage} />}
        {!format && <div key={page.id} className="reader-flat">{renderPage(index, true)}</div>}
      </div>
      {format && <div ref={thumbnails} className="reader-thumbnails" role="group" aria-label={t('booklet.pageThumbnails')}>
        {pages.map((item, number) => <button type="button" key={item.id} aria-label={t('booklet.goToPage', { number: number + 1 })} aria-current={index === number ? 'page' : undefined} title={item.title} onClick={() => setIndex(number)}>
          {item.imageUrl ? <img src={item.imageUrl} alt="" loading="lazy" /> : <span className="reader-text-thumbnail">{item.title || t('booklet.pageNumber', { number: number + 1 })}</span>}
          <span>{number + 1}</span>
        </button>)}
      </div>}
      <nav aria-label={t('booklet.navigation')}>
        <button type="button" disabled={atStart} onClick={() => turn(-1)}>{format === 'sheet' ? t('booklet.sheetFront') : t('booklet.previous')}</button>
        <span aria-live="polite">{format === 'booklet' && pages.length > 2
          ? <select aria-label={t('booklet.choosePage')} value={index} onChange={(event) => setIndex(Number(event.target.value))}>
            {pages.map((item, number) => <option key={item.id} value={number}>{number + 1} · {item.title || t('booklet.pageNumber', { number: number + 1 })}</option>)}
          </select> : page.title || t('booklet.pageNumber', { number: index + 1 })}<small>{range} / {pages.length}</small></span>
        <button type="button" disabled={atEnd} onClick={() => turn(1)}>{format === 'sheet' ? t('booklet.sheetBack') : t('booklet.next')}</button>
      </nav>
    </dialog>
  )
}
