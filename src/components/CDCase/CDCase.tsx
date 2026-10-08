import { forwardRef, type RefObject } from 'react'
import type { Album, AlbumDisc } from '../../types/album'
import { getAlbumDiscs } from '../../lib/album'

export const CDCase = forwardRef<
  HTMLDivElement,
  {
    album: Album
    disc?: AlbumDisc
    frontDisc: AlbumDisc
    backDisc: AlbumDisc
    trayRef: RefObject<HTMLDivElement | null>
  }
>(function CDCase({ album, disc, frontDisc, backDisc, trayRef }, ref) {
  const discs = getAlbumDiscs(album)
  const selected = disc ?? discs[0]
  return (
    <div className="cd-case" ref={ref}>
      <div className="case-back" />
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
