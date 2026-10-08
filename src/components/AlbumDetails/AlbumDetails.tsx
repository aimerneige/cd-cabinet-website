import type { Album } from '../../types/album'

export function AlbumDetails({ album }: { album: Album }) {
  return (
    <div className="album-details">
      <div className="album-heading">
        <span className="eyebrow">FROM YOUR COLLECTION</span>
        <h2>{album.title}</h2>
        <p>{album.artist}</p>
        <span className="album-meta">
          {album.year} <b>·</b> {album.genre} <b>·</b> Compact disc
        </span>
      </div>
      <ol className="track-list">
        {album.tracks.map((track, i) => (
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
