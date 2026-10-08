import { forwardRef } from 'react'
import type { Album, AlbumDisc } from '../../types/album'
import { getAlbumDiscs } from '../../lib/album'

export const CDCase = forwardRef<
  HTMLDivElement,
  { album: Album; disc?: AlbumDisc }
>(function CDCase({ album, disc }, ref) {
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
      <div className="disc-tray">
        <div className="tray-ring" />
        <div
          className="disc"
          key={selected.id}
          style={{
            backgroundImage: `url(${selected.labelUrl ?? album.coverUrl})`,
          }}
        >
          <div className="disc-center" />
        </div>
        <div className="tray-hub" />
        {discs.length > 1 && (
          <span className="tray-disc-label">
            DISC {discs.findIndex((item) => item.id === selected.id) + 1} /{' '}
            {discs.length}
          </span>
        )}
      </div>
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
