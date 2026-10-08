import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { CSSProperties } from 'react'
import type { Album } from '../../types/album'

interface Props {
  album: Album
  edit: boolean
  hidden: boolean
  onOpen: (album: Album, element: HTMLButtonElement) => void
}

export function ShelfCD({ album, edit, hidden, onOpen }: Props) {
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
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 2 : undefined,
      }}
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
        <span className="spine-cap">
          {String(album.order + 1).padStart(2, '0')}
        </span>
        <span className="spine-artist">{album.artist}</span>
        <span className="spine-title">{album.title}</span>
        <span className="spine-label">
          {album.year} <i>◉</i>
        </span>
      </button>
    </div>
  )
}
