import { useEffect, useRef, useState } from 'react'
import { useTranslation } from '../../i18n'
import './SampleCollectionActions.css'

export function SampleCollectionActions({ count, missingCount, disabled, onClear, onRestore }: {
  count: number
  missingCount: number
  disabled: boolean
  onClear: () => Promise<void>
  onRestore: () => Promise<void>
}) {
  const { t } = useTranslation()
  const dialog = useRef<HTMLDialogElement>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [pending, setPending] = useState<'clear' | 'restore' | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!confirmClear) return
    const previous = document.activeElement as HTMLElement | null
    const element = dialog.current!
    element.showModal()
    return () => {
      element.close()
      requestAnimationFrame(() => {
        const target = previous?.isConnected && !previous.matches(':disabled') ? previous : document.querySelector<HTMLButtonElement>('.add-recording')
        target?.focus({ preventScroll: true })
      })
    }
  }, [confirmClear])
  async function clear() {
    if (pending) return
    setPending('clear')
    setError('')
    try { await onClear(); setConfirmClear(false) }
    catch { setError(t('samples.clearFailed')) }
    finally { setPending(null) }
  }
  async function restore() {
    if (pending) return
    setPending('restore')
    setError('')
    try { await onRestore() }
    catch { setError(t('samples.restoreFailed')) }
    finally { setPending(null) }
  }
  return <div className="sample-collection-actions">
    <button type="button" className="clear-samples" disabled={disabled || !!pending || count === 0} onClick={() => { setError(''); setConfirmClear(true) }}>{t('samples.clear')}</button>
    <button type="button" disabled={disabled || !!pending || missingCount === 0} onClick={() => void restore()}>{t(pending === 'restore' ? 'samples.restoring' : 'samples.restore')}</button>
    {error && !confirmClear && <p className="sample-actions-error" role="alert">{error}</p>}
    {confirmClear && <dialog ref={dialog} className="delete-album-dialog" role="alertdialog" aria-labelledby="clear-samples-title" aria-describedby="clear-samples-message"
      onKeyDown={(event) => event.stopPropagation()}
      onCancel={(event) => { event.preventDefault(); event.stopPropagation(); if (!pending) setConfirmClear(false) }}>
      <h2 id="clear-samples-title">{t('samples.clearTitle')}</h2>
      <p id="clear-samples-message">{t('samples.clearMessage', { count })}</p>
      {error && <p className="editor-error" role="alert">{error}</p>}
      <div>
        <button type="button" autoFocus disabled={!!pending} onClick={() => setConfirmClear(false)}>{t('editor.cancel')}</button>
        <button type="button" className="confirm-delete-album" disabled={!!pending} onClick={() => void clear()}>{t(pending === 'clear' ? 'samples.clearing' : 'samples.clear')}</button>
      </div>
    </dialog>}
  </div>
}
