import { useEffect, useRef, useState } from 'react'
import type { Album } from '../../types/album'
import { hasObi } from '../../lib/album'
import { getBackCoverArtwork, getInnerArtwork, getObiArtwork, getSpineArtwork } from '../../lib/generatedCover'
import { useTranslation } from '../../i18n'
import './ArtworkReader.css'

export function ArtworkReader({ album, mode, onClose }: { album: Album; mode: 'booklet' | 'case'; onClose: () => void }) {
  const { t } = useTranslation()
  const dialog = useRef<HTMLDialogElement>(null)
  const paper = useRef<HTMLDivElement>(null)
  const thumbnails = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const pages = mode === 'booklet' ? [
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
    paper.current?.scrollTo(0, 0)
    thumbnails.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [index])
  function turn(direction: number) { setIndex((previous) => Math.max(0, Math.min(pages.length - 1, previous + direction))) }
  return (
    <dialog ref={dialog} className="artwork-reader" aria-labelledby="artwork-reader-title"
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
        <div><span className="eyebrow">{album.artist}</span><h2 id="artwork-reader-title">{mode === 'booklet' ? t('booklet.heading') : t('booklet.caseArtwork')}</h2></div>
        <button type="button" onClick={onClose} aria-label={t('booklet.close')}>×</button>
      </header>
      <div ref={paper} className={`reader-paper${page.imageUrl ? ' has-image' : ''}${page.text ? ' has-text' : ''}`} key={page.id}>
        {page.imageUrl && <img src={page.imageUrl} alt={page.title || t('booklet.pageNumber', { number: index + 1 })} />}
        {(!page.imageUrl || page.text) && <article><h3>{page.title}</h3><p>{page.text}</p></article>}
      </div>
      {mode === 'booklet' && <div ref={thumbnails} className="reader-thumbnails" role="group" aria-label={t('booklet.pageThumbnails')}>
        {pages.map((item, number) => <button type="button" key={item.id} aria-label={t('booklet.goToPage', { number: number + 1 })} aria-current={index === number ? 'page' : undefined} title={item.title} onClick={() => setIndex(number)}>
          {item.imageUrl ? <img src={item.imageUrl} alt="" loading="lazy" /> : <span className="reader-text-thumbnail">{item.title || t('booklet.pageNumber', { number: number + 1 })}</span>}
          <span>{number + 1}</span>
        </button>)}
      </div>}
      <nav aria-label={t('booklet.navigation')}>
        <button type="button" disabled={index === 0} onClick={() => turn(-1)}>{t('booklet.previous')}</button>
        <span aria-live="polite">{mode === 'booklet' && pages.length > 2
          ? <select aria-label={t('booklet.choosePage')} value={index} onChange={(event) => setIndex(Number(event.target.value))}>
            {pages.map((item, number) => <option key={item.id} value={number}>{number + 1} · {item.title || t('booklet.pageNumber', { number: number + 1 })}</option>)}
          </select> : page.title || t('booklet.pageNumber', { number: index + 1 })}<small>{index + 1} / {pages.length}</small></span>
        <button type="button" disabled={index === pages.length - 1} onClick={() => turn(1)}>{t('booklet.next')}</button>
      </nav>
    </dialog>
  )
}
