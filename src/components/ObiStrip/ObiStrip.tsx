import type { CSSProperties, RefObject } from 'react'
import type { Album } from '../../types/album'
import { getCaseDepth } from '../../lib/album'
import { getObiArtwork } from '../../lib/generatedCover'
import { useTranslation } from '../../i18n'

export function ObiStrip({
  album,
  paperRef,
  hidden,
}: {
  album: Album
  paperRef: RefObject<HTMLDivElement | null>
  hidden: boolean
}) {
  const { t } = useTranslation()
  const depth = getCaseDepth(album) + 8
  const style = {
    '--obi-depth': `${depth}px`,
    '--obi-width': `${92 + depth}px`,
    '--obi-image': `url(${getObiArtwork(album)})`,
  } as CSSProperties
  const print = (side: 'back' | 'spine' | 'front') => (
    <div
      className={`obi-print obi-print-${side} obi-artwork${album.obiUrl ? ' obi-uploaded' : ''}`}
    >
      {album.obiUrl && <img src={album.obiUrl} alt="" draggable={false} loading="eager" decoding="sync"
        style={{ left: side === 'front' ? -46 - depth : side === 'spine' ? -46 : 0, width: 92 + depth, height: 304 }} />}
    </div>
  )
  return (
    <div
      className="obi-strip"
      ref={paperRef}
      style={style}
      role="img"
      aria-label={t('viewer.obiStripAlt', { title: album.title })}
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
