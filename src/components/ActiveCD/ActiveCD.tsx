import { useEffect, useRef } from 'react'
import { useDiscAnimation } from '../../hooks/useDiscAnimation'
import type { Album } from '../../types/album'
import { useAlbumAnimation } from '../../hooks/useAlbumAnimation'
import type { Origin } from '../../hooks/useAlbumAnimation'
import { CDCase } from '../CDCase/CDCase'
import { AlbumDetails } from '../AlbumDetails/AlbumDetails'
import { getAlbumDiscs, getCaseDepth } from '../../lib/album'
import { useObiAnimation } from '../../hooks/useObiAnimation'
import { useTranslation } from '../../i18n'

export function ActiveCD({
  album,
  origin,
  onReturned,
  onEdit,
}: {
  album: Album
  origin: Origin
  onReturned: () => void
  onEdit: (id: string) => void
}) {
  const { t } = useTranslation()
  const discs = getAlbumDiscs(album)
  const {
    trayRef,
    frontDisc,
    backDisc,
    discIndex,
    isTurning,
    selectDisc,
    resetTray,
  } = useDiscAnimation(discs)
  const disc = discs[discIndex] ?? discs[0]
  const {
    layer,
    caseRef,
    close: closeCase,
    view,
    isOpen,
    isChangingView,
    selectView,
  } = useAlbumAnimation(origin, getCaseDepth(album), onReturned)
  const {
    paperRef,
    mode: obiMode,
    isMoving,
    selectMode,
    resetObi,
  } = useObiAnimation(caseRef, getCaseDepth(album))
  const close = () => {
    closeCase((onFolded) => resetObi(() => resetTray(onFolded)))
  }
  const button = useRef<HTMLButtonElement>(null)
  const closeRef = useRef(close)
  closeRef.current = close
  useEffect(() => {
    const source = document.querySelector<HTMLButtonElement>(
      `[data-album-id="${album.id}"]`,
    )
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    button.current?.focus({ preventScroll: true })
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current()
      if (event.key === 'Tab') {
        const controls = [
          ...layer.current!.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href]',
          ),
        ].filter(
          (element) => element.getClientRects().length && !element.hidden,
        )
        const first = controls[0]
        const last = controls[controls.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }
    }
    window.addEventListener('keydown', keydown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', keydown)
      requestAnimationFrame(() => source?.focus({ preventScroll: true }))
    }
  }, [album.id])
  return (
    <div
      ref={layer}
      className="active-layer"
      role="dialog"
      aria-modal="true"
      aria-label={t('viewer.dialogAria', {
        title: album.title,
        artist: album.artist,
      })}
    >
      <div className="collection-overlay" onClick={close} />
      <div className="viewer-controls">
        <span>{t('viewer.closerLook')}</span>
        <div className="viewer-actions">
          <button
            onClick={() => {
              onEdit(album.id)
              close()
            }}
          >
            {t('viewer.editRecording')}
          </button>
          <button
            ref={button}
            onClick={close}
            aria-label={t('viewer.closeAlbumAria')}
          >
            {t('viewer.close')} <span>×</span>
          </button>
        </div>
      </div>
      <CDCase
        album={album}
        disc={disc}
        frontDisc={frontDisc}
        backDisc={backDisc}
        trayRef={trayRef}
        ref={caseRef}
        view={view}
        paperRef={paperRef}
        obiMode={obiMode}
      />
      <AlbumDetails
        album={album}
        disc={disc}
        onSelectDisc={selectDisc}
        isTurning={isTurning || isChangingView || isMoving}
        view={view}
        onSelectView={(next) => {
          if (next === 'inside') selectMode('hidden', () => selectView(next))
          else selectView(next)
        }}
        isOpen={isOpen}
        obiMode={obiMode}
        onSelectObi={selectMode}
      />
    </div>
  )
}
