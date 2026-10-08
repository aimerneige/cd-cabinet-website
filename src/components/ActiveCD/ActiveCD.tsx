import { useEffect, useRef } from 'react'
import type { Album } from '../../types/album'
import { useAlbumAnimation } from '../../hooks/useAlbumAnimation'
import type { Origin } from '../../hooks/useAlbumAnimation'
import { CDCase } from '../CDCase/CDCase'
import { AlbumDetails } from '../AlbumDetails/AlbumDetails'

export function ActiveCD({
  album,
  origin,
  onReturned,
}: {
  album: Album
  origin: Origin
  onReturned: () => void
}) {
  const { layer, caseRef, close } = useAlbumAnimation(origin, onReturned)
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
        event.preventDefault()
        button.current?.focus()
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
      aria-label={`${album.title} by ${album.artist}`}
    >
      <div className="collection-overlay" onClick={close} />
      <div className="viewer-controls">
        <span>TAKE A CLOSER LOOK</span>
        <button ref={button} onClick={close} aria-label="Close album">
          Close <span>×</span>
        </button>
      </div>
      <CDCase album={album} ref={caseRef} />
      <AlbumDetails album={album} />
    </div>
  )
}
