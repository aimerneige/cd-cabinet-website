import { useEffect, useRef, useState } from 'react'
import type { Album } from '../../types/album'
import { useTranslation } from '../../i18n'

export function DeleteAlbumDialog({ album, onConfirm, onCancel }: {
  album: Album
  onConfirm: () => Promise<void>
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const dialog = useRef<HTMLDialogElement>(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const element = dialog.current!
    element.showModal()
    return () => {
      element.close()
      requestAnimationFrame(() => previous?.focus({ preventScroll: true }))
    }
  }, [])
  async function confirm() {
    if (deleting) return
    setDeleting(true)
    setError('')
    try { await onConfirm() }
    catch {
      setError(t('deleteAlbum.failed'))
      setDeleting(false)
    }
  }
  return <dialog ref={dialog} className="delete-album-dialog" role="alertdialog" aria-labelledby="delete-album-title" aria-describedby="delete-album-message"
    onKeyDown={(event) => event.stopPropagation()}
    onCancel={(event) => { event.preventDefault(); event.stopPropagation(); if (!deleting) onCancel() }}>
    <h2 id="delete-album-title">{t('deleteAlbum.title')}</h2>
    <p id="delete-album-message">{t('deleteAlbum.message', { title: album.title, artist: album.artist })}</p>
    {error && <p className="editor-error" role="alert">{error}</p>}
    <div>
      <button type="button" autoFocus disabled={deleting} onClick={onCancel}>{t('editor.cancel')}</button>
      <button type="button" className="confirm-delete-album" disabled={deleting} onClick={() => void confirm()}>{t(deleting ? 'deleteAlbum.deleting' : 'deleteAlbum.confirm')}</button>
    </div>
  </dialog>
}
