import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { ShelfCD } from './ShelfCD'
import { useCollection } from '../../store/collectionStore'
import type { Album } from '../../types/album'

interface Props {
  albums: Album[]
  onOpen: (album: Album, element: HTMLButtonElement) => void
}

export function Shelf({ albums, onOpen }: Props) {
  const { editMode, activeAlbumId, reorderAlbum } = useCollection()
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )
  const ids = [...new Set(albums.map((a) => a.shelfId))].sort()
  return (
    <div className={`cabinet ${editMode ? 'cabinet-edit' : ''}`}>
      <div className="cabinet-top" />
      {ids.map((id) => {
        const records = albums.filter((a) => a.shelfId === id)
        return (
          <section
            className="shelf"
            key={id}
            aria-label={`Shelf ${id.split('-')[1]}`}
          >
            <div className="shelf-cavity">
              <div className="shelf-inner">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={({ active, over }) => {
                    if (over) reorderAlbum(String(active.id), String(over.id))
                  }}
                >
                  <SortableContext
                    items={records.map((a) => a.id)}
                    strategy={horizontalListSortingStrategy}
                  >
                    {records.map((album) => (
                      <ShelfCD
                        key={album.id}
                        album={album}
                        edit={editMode}
                        hidden={activeAlbumId === album.id}
                        onOpen={onOpen}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
                <div className="bookend" aria-hidden="true" />
                <div className="shelf-empty">
                  <span>Collected with care.</span>
                  <i>Made to be rediscovered.</i>
                </div>
              </div>
            </div>
            <div className="shelf-edge">
              <span>0{id.split('-')[1]}</span>
              <span>{records.length} RECORDINGS</span>
              <i />
            </div>
          </section>
        )
      })}
      {!albums.length && (
        <div className="empty-state">
          No recordings found. Try another artist or album.
        </div>
      )}
      <div className="cabinet-base" />
    </div>
  )
}
