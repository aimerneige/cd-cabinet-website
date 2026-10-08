import type { CSSProperties, RefObject } from 'react'
import type { Album } from '../../types/album'
import { getAlbumDiscs, getCaseDepth } from '../../lib/album'

export function ObiStrip({
  album,
  paperRef,
  hidden,
}: {
  album: Album
  paperRef: RefObject<HTMLDivElement | null>
  hidden: boolean
}) {
  const depth = getCaseDepth(album) + 8
  const style = {
    '--obi-depth': `${depth}px`,
    '--obi-width': `${92 + depth}px`,
    '--obi-ink': album.color,
    '--obi-image': album.obiUrl ? `url(${album.obiUrl})` : 'none',
  } as CSSProperties
  const print = (side: string) => (
    <div
      className={`obi-print obi-print-${side}${album.obiUrl ? ' obi-uploaded' : ''}`}
    >
      {!album.obiUrl && (
        <>
          <span className="obi-edition">COMPACT DISC</span>
          <strong>{side === 'back' ? album.artist : album.title}</strong>
          <span className="obi-caption">
            {side === 'back'
              ? `${album.year} · ${getAlbumDiscs(album).length} CD`
              : album.artist}
          </span>
          <span className="obi-footer">ORIGINAL RECORDINGS</span>
        </>
      )}
    </div>
  )
  return (
    <div
      className="obi-strip"
      ref={paperRef}
      style={style}
      role="img"
      aria-label={`${album.title} OBI paper strip`}
      aria-hidden={hidden}
    >
      <div className="obi-front">{print('front')}</div>
      <div className="obi-spine-fold">
        {print('spine')}
        <div className="obi-back-fold">{print('back')}</div>
      </div>
    </div>
  )
}
