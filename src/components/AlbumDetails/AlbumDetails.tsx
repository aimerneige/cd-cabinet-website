import type { Album, AlbumDisc } from '../../types/album'
import { getAlbumDiscs } from '../../lib/album'
import type { CaseView } from '../../hooks/useAlbumAnimation'

export function AlbumDetails({
  album,
  disc,
  onSelectDisc,
  isTurning,
  view,
  onSelectView,
}: {
  album: Album
  disc: AlbumDisc
  onSelectDisc: (index: number) => void
  isTurning: boolean
  view: CaseView
  onSelectView: (view: CaseView) => void
}) {
  const discs = getAlbumDiscs(album)
  return (
    <div className="album-details">
      <div className="album-heading">
        <span className="eyebrow">FROM YOUR COLLECTION</span>
        <h2>{album.title}</h2>
        <p>{album.artist}</p>
        <span className="album-meta">
          {album.year} <b>·</b> {album.genre} <b>·</b>{' '}
          {discs.length > 1 ? `${discs.length} CDs` : 'Compact disc'}
        </span>
        {discs.length > 1 && (
          <div className="disc-selector" aria-label="Choose a disc">
            {discs.map((item, index) => (
              <button
                key={item.id}
                aria-pressed={disc.id === item.id}
                disabled={isTurning || view !== 'inside'}
                onClick={() => onSelectDisc(index)}
              >
                Disc {index + 1}
              </button>
            ))}
          </div>
        )}
        {disc.title && <p className="disc-title">{disc.title}</p>}
        <div
          className="disc-selector case-view-selector"
          aria-label="View the case"
        >
          {(['front', 'inside', 'back'] as const).map((item) => (
            <button
              key={item}
              aria-pressed={view === item}
              disabled={isTurning}
              onClick={() => onSelectView(item)}
            >
              {item === 'front'
                ? 'Front'
                : item === 'inside'
                  ? 'Inside'
                  : 'Back'}
            </button>
          ))}
        </div>
      </div>
      <ol className="track-list" aria-busy={isTurning}>
        {!disc.tracks.length && (
          <li className="empty-tracks">
            No track information for this disc yet.
          </li>
        )}
        {disc.tracks.map((track, i) => (
          <li key={track.id}>
            <span className="track-number">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span>{track.title}</span>
            <time>{track.duration}</time>
          </li>
        ))}
      </ol>
    </div>
  )
}
