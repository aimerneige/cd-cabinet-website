import { useEffect, useRef } from 'react'
import { useTranslation } from '../../i18n'

export function ArtworkAlert({ message, returnFocus, onClose }: {
  message: string
  returnFocus: HTMLElement | null
  onClose: () => void
}) {
  const { t } = useTranslation()
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const element = dialog.current!
    element.showModal()
    return () => {
      element.close()
      requestAnimationFrame(() => returnFocus?.focus({ preventScroll: true }))
    }
  }, [returnFocus])
  return (
    <dialog ref={dialog} className="artwork-alert" role="alertdialog" aria-labelledby="artwork-alert-title" aria-describedby="artwork-alert-message"
      onKeyDown={(event) => event.stopPropagation()}
      onCancel={(event) => { event.preventDefault(); event.stopPropagation(); onClose() }}>
      <h2 id="artwork-alert-title">{t('artworkErrors.title')}</h2>
      <p id="artwork-alert-message">{message}</p>
      <div><button type="button" autoFocus onClick={onClose}>{t('artworkErrors.dismiss')}</button></div>
    </dialog>
  )
}
