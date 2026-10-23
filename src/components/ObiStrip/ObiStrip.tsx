import type { CSSProperties, RefObject } from 'react'
import type { Album } from '../../types/album'
import { getObiLayout } from '../../lib/obi'
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
  const layout = getObiLayout(album)
  const style = {
    '--obi-depth': `${layout.depth}px`,
    '--obi-width': `${layout.width}px`,
    '--obi-front-width': `${layout.frontWidth}px`,
    '--obi-back-width': `${layout.backWidth}px`,
    '--obi-height': `${layout.height}px`,
    '--obi-image': `url(${getObiArtwork(album)})`,
  } as CSSProperties
  const print = (side: 'back' | 'spine' | 'front') => (
    <div
      className={`obi-print obi-print-${side} obi-artwork${album.obiUrl ? ' obi-uploaded' : ''}`}
    >
      {album.obiUrl && <img src={album.obiUrl} alt="" draggable={false} loading="eager" decoding="sync"
        style={{ left: side === 'front' ? -layout.backWidth - layout.depth : side === 'spine' ? -layout.backWidth : 0, width: layout.width, height: layout.height }} />}
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
