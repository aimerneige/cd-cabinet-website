import { useEffect, useRef } from 'react'
import { useTranslation } from '../../i18n'

export function UnsavedChangesDialog({ onKeepEditing, onDiscard }: {
  onKeepEditing: () => void
  onDiscard: () => void
}) {
  const { t } = useTranslation()
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const element = dialog.current!
    element.showModal()
    return () => {
      element.close()
      requestAnimationFrame(() => previous?.focus({ preventScroll: true }))
    }
  }, [])
  return <dialog ref={dialog} className="delete-album-dialog" role="alertdialog" aria-labelledby="unsaved-changes-title" aria-describedby="unsaved-changes-message"
    onKeyDown={(event) => event.stopPropagation()}
    onCancel={(event) => { event.preventDefault(); event.stopPropagation(); onKeepEditing() }}>
    <h2 id="unsaved-changes-title">{t('editor.unsavedTitle')}</h2>
    <p id="unsaved-changes-message">{t('editor.unsavedMessage')}</p>
    <div>
      <button type="button" autoFocus onClick={onKeepEditing}>{t('editor.keepEditing')}</button>
      <button type="button" className="confirm-delete-album" onClick={onDiscard}>{t('editor.discardChanges')}</button>
    </div>
  </dialog>
}
