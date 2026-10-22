import type { BookletPage } from '../../types/album'
import { useTranslation } from '../../i18n'

export function BookletPagesEditor({ pages, onChange, onUpload, disabled }: {
  pages: BookletPage[]
  onChange: (pages: BookletPage[]) => void
  onUpload: (files: File[]) => void
  disabled: boolean
}) {
  const { t } = useTranslation()
  function move(index: number, direction: number) {
    const next = [...pages]
    const [page] = next.splice(index, 1)
    next.splice(index + direction, 0, page)
    onChange(next)
  }
  return (
    <fieldset className="booklet-pages-editor" disabled={disabled}>
      <legend>{t('booklet.pages')}</legend>
      <p>{t('booklet.guidance')}</p>
      <div className="booklet-editor-actions">
        <label className="audio-upload">
          <span>{t('booklet.uploadPages')}</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple aria-label={t('booklet.uploadPages')} onChange={(event) => {
            onUpload([...event.target.files ?? []])
            event.target.value = ''
          }} />
        </label>
        <button type="button" onClick={() => onChange([...pages, { id: crypto.randomUUID?.() ?? `page-${crypto.getRandomValues(new Uint32Array(2)).join('-')}`, title: '', text: '' }])}>{t('booklet.addTextPage')}</button>
      </div>
      <ol>
        {pages.map((page, index) => (
          <li key={page.id}>
            <div className="booklet-page-actions">
              <strong>{t('booklet.pageNumber', { number: index + 1 })}</strong>
              <button type="button" disabled={disabled || index === 0} aria-label={t('booklet.moveUp', { number: index + 1 })} onClick={() => move(index, -1)}>↑</button>
              <button type="button" disabled={disabled || index === pages.length - 1} aria-label={t('booklet.moveDown', { number: index + 1 })} onClick={() => move(index, 1)}>↓</button>
              <button type="button" aria-label={t('booklet.removePage', { number: index + 1 })} onClick={() => onChange(pages.filter((item) => item.id !== page.id))}>×</button>
            </div>
            {page.imageUrl && <img src={page.imageUrl} alt={t('booklet.pageNumber', { number: index + 1 })} />}
            <label>{t('booklet.pageTitle', { number: index + 1 })}<input maxLength={100} value={page.title} onChange={(event) => onChange(pages.map((item) => item.id === page.id ? { ...item, title: event.target.value } : item))} /></label>
            <label>{t('booklet.pageText', { number: index + 1 })}<textarea rows={6} value={page.text} onChange={(event) => onChange(pages.map((item) => item.id === page.id ? { ...item, text: event.target.value } : item))} /></label>
          </li>
        ))}
      </ol>
    </fieldset>
  )
}
