import { forwardRef } from 'react'
import type { Album } from '../../types/album'

export const CDCase = forwardRef<HTMLDivElement, { album: Album }>(
  function CDCase({ album }, ref) {
    return (
      <div className="cd-case" ref={ref}>
        <div className="case-back" />
        <div className="case-edge edge-top" />
        <div className="case-edge edge-bottom" />
        <div
          className="case-spine"
          style={{ background: album.color, color: album.ink }}
        >
          <span>
            {album.artist} · {album.title}
          </span>
        </div>
        <div className="case-edge edge-right" />
        <div className="disc-tray">
          <div className="tray-ring" />
          <div
            className="disc"
            style={{ backgroundImage: `url(${album.coverUrl})` }}
          >
            <div className="disc-center" />
          </div>
          <div className="tray-hub" />
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
  },
)
