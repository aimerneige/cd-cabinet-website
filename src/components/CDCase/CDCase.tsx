import { forwardRef, type RefObject } from 'react'
import type { Album, AlbumDisc } from '../../types/album'
import { getAlbumDiscs } from '../../lib/album'
import type { CaseView } from '../../hooks/useAlbumAnimation'

export const CDCase = forwardRef<
  HTMLDivElement,
  {
    album: Album
    disc?: AlbumDisc
    frontDisc: AlbumDisc
    backDisc: AlbumDisc
    trayRef: RefObject<HTMLDivElement | null>
    view: CaseView
  }
>(function CDCase({ album, disc, frontDisc, backDisc, trayRef, view }, ref) {
  const discs = getAlbumDiscs(album)
  const selected = disc ?? discs[0]
  return (
    <div className="cd-case" ref={ref}>
      <div className="case-body">
        <div className="case-back" />
        <div
          className="case-rear"
          aria-hidden={view !== 'back'}
          style={{ background: album.color, color: album.ink }}
        >
          {album.backCoverUrl ? (
            <img
              src={album.backCoverUrl}
              alt={`${album.title} back cover artwork`}
            />
          ) : (
            <div className="generated-back-cover">
              <span>ORIGINAL RECORDINGS</span>
              <h3>{album.title}</h3>
              <p>{album.artist}</p>
              <ol>
                {album.tracks.slice(0, 12).map((track) => (
                  <li key={track.id}>
                    {track.title}
                    <small>{track.duration}</small>
                  </li>
                ))}
              </ol>
              <footer>
                {album.year} · {discs.length}{' '}
                {discs.length === 1 ? 'CD' : 'CDs'} · {album.genre}
              </footer>
            </div>
          )}
        </div>
        <div className="case-edge edge-top" />
        <div className="case-edge edge-bottom" />
        <div
          className="case-spine"
          style={{ background: album.color, color: album.ink }}
        >
          {album.spineUrl ? (
            <img className="spine-artwork" src={album.spineUrl} alt="" />
          ) : (
            <span>
              {album.artist} · {album.title}
            </span>
          )}
        </div>
        <div className="case-edge edge-right" />
        {discs.length === 3 && <DiscTray album={album} disc={discs[2]} />}
        <div className="tray-leaf" ref={trayRef}>
          <DiscTray album={album} disc={frontDisc} side="front" />
          {discs.length > 1 && (
            <DiscTray album={album} disc={backDisc} side="back" />
          )}
        </div>
        <span className="selected-disc-label" aria-live="polite">
          {discs.length > 1
            ? `DISC ${discs.findIndex((item) => item.id === selected.id) + 1} / ${discs.length}`
            : ''}
        </span>
        <div className="case-lid">
          <div className="lid-front">
            <img src={album.coverUrl} alt={`${album.title} cover artwork`} />
          </div>
          <div className="lid-inside">
            <img src={album.coverUrl} alt="" />
            <span>ORIGINAL RECORDINGS · {album.year}</span>
          </div>
        </div>
      </div>
    </div>
  )
})

function DiscTray({
  album,
  disc,
  side = 'base',
}: {
  album: Album
  disc: AlbumDisc
  side?: string
}) {
  const discs = getAlbumDiscs(album)
  return (
    <div className={`disc-tray tray-${side}`}>
      <div className="tray-ring" />
      <div
        className="disc"
        style={{
          backgroundImage: `url(${disc.labelUrl ?? album.coverUrl})`,
        }}
      >
        <div className="disc-center" />
      </div>
      <div className="tray-hub" />
      {discs.length > 1 && (
        <span className="tray-disc-label">
          DISC {discs.findIndex((item) => item.id === disc.id) + 1} /{' '}
          {discs.length}
        </span>
      )}
    </div>
  )
}
