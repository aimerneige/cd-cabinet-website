import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { CSSProperties } from 'react'
import type { Album } from '../../types/album'
import { getAlbumDiscs, getCaseDepth } from '../../lib/album'

interface Props {
  album: Album
  edit: boolean
  hidden: boolean
  onOpen: (album: Album, element: HTMLButtonElement) => void
}

export function ShelfCD({ album, edit, hidden, onOpen }: Props) {
  const discCount = getAlbumDiscs(album).length
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: album.id, disabled: !edit })
  return (
    <div
      ref={setNodeRef}
      className={`spine-slot ${isDragging ? 'is-dragging' : ''}`}
      style={
        {
          transform: CSS.Transform.toString(transform),
          transition,
          zIndex: isDragging ? 2 : undefined,
          '--spine-units': getCaseDepth(album) / 24,
        } as CSSProperties
      }
    >
      <button
        ref={setActivatorNodeRef}
        {...(edit ? attributes : {})}
        {...(edit ? listeners : {})}
        type="button"
        data-album-id={album.id}
        className={`shelf-cd ${hidden ? 'is-away' : ''}`}
        style={
          {
            '--spine-color': album.color,
            '--spine-ink': album.ink,
          } as CSSProperties
        }
        onClick={(event) => {
          if (!edit) onOpen(album, event.currentTarget)
        }}
        aria-label={
          edit
            ? `Reorder ${album.title} by ${album.artist}`
            : `Open ${album.title} by ${album.artist}`
        }
      >
        {album.spineUrl ? (
          <img className="spine-artwork" src={album.spineUrl} alt="" />
        ) : (
          <>
            <span className="spine-cap">
              {String(album.order + 1).padStart(2, '0')}
            </span>
            <span className="spine-copy">
              <span className="spine-artist">{album.artist}</span>
              <span aria-hidden="true"> · </span>
              <span className="spine-title">{album.title}</span>
            </span>
            <span className="spine-label">{album.year}</span>
          </>
        )}
        {discCount > 1 && (
          <span className="spine-disc-count" aria-hidden="true">
            {discCount}CD
          </span>
        )}
      </button>
    </div>
  )
}
