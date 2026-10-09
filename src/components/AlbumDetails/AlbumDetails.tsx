import type { Album, AlbumDisc } from '../../types/album'
import { getAlbumDiscs } from '../../lib/album'
import type { CaseView } from '../../hooks/useAlbumAnimation'
import type { ObiMode } from '../../hooks/useObiAnimation'
import { useTranslation } from '../../i18n'

export function AlbumDetails({
  album,
  disc,
  onSelectDisc,
  isTurning,
  view,
  onSelectView,
  obiMode,
  onSelectObi,
  isOpen,
  onPlayTrack,
  currentTrackId,
  isPlayingDisc,
}: {
  album: Album
  disc: AlbumDisc
  onSelectDisc: (index: number) => void
  isTurning: boolean
  view: CaseView
  onSelectView: (view: CaseView) => void
  obiMode: ObiMode
  onSelectObi: (mode: ObiMode) => void
  isOpen: boolean
  onPlayTrack: (index: number) => void
  currentTrackId?: string
  isPlayingDisc: boolean
}) {
  const { t } = useTranslation()
  const discs = getAlbumDiscs(album)
  return (
    <div className="album-details">
      <div className="album-heading">
        <span className="eyebrow">{t('viewer.fromCollection')}</span>
        <h2>{album.title}</h2>
        <p>{album.artist}</p>
        <span className="album-meta">
          {album.year} <b>·</b> {album.genre} <b>·</b>{' '}
          {discs.length > 1
            ? t('viewer.multipleDiscs', { count: discs.length })
            : t('viewer.singleDisc')}
        </span>
        {discs.length > 1 && (
          <div className="disc-selector" aria-label={t('viewer.chooseDiscAria')}>
            {discs.map((item, index) => (
              <button
                key={item.id}
                aria-pressed={disc.id === item.id}
                disabled={isTurning || view !== 'inside' || obiMode === 'flat'}
                onClick={() => onSelectDisc(index)}
              >
                {t('viewer.discButton', { number: index + 1 })}
              </button>
            ))}
          </div>
        )}
        {disc.title && <p className="disc-title">{disc.title}</p>}
        <div
          className="disc-selector case-view-selector"
          aria-label={t('viewer.viewCaseAria')}
        >
          {(['front', 'inside', 'back'] as const).map((item) => (
            <button
              key={item}
              aria-pressed={view === item}
              disabled={isTurning || isPlayingDisc || obiMode === 'flat'}
              onClick={() => onSelectView(item)}
            >
              {item === 'front'
                ? t('viewer.viewFront')
                : item === 'inside'
                  ? t('viewer.viewInside')
                  : t('viewer.viewBack')}
            </button>
          ))}
        </div>
        <div className="obi-controls">
          <span>{t('viewer.obiStripHeading')}</span>
          <div className="disc-selector" aria-label={t('viewer.obiStripAria')}>
            {(['attached', 'hidden', 'flat'] as const).map((item) => (
              <button
                key={item}
                aria-pressed={obiMode === item}
                disabled={isTurning || isPlayingDisc || (item === 'attached' && isOpen)}
                onClick={() => onSelectObi(item)}
              >
                {item === 'attached'
                  ? t('viewer.obiAttached')
                  : item === 'hidden'
                    ? t('viewer.obiHidden')
                    : t('viewer.obiFlat')}
              </button>
            ))}
          </div>
        </div>
      </div>
      <ol className="track-list" aria-busy={isTurning}>
        {!disc.tracks.length && (
          <li className="empty-tracks">
            {t('viewer.emptyTracks')}
          </li>
        )}
        {disc.tracks.map((track, i) => (
          <li key={track.id} className={currentTrackId === track.id ? 'current-track' : ''}>
            <span className="track-number">
              {String(i + 1).padStart(2, '0')}
            </span>
            <button
              className="track-title"
              disabled={isTurning}
              aria-label={t('player.playTrack', { title: track.title })}
              aria-current={currentTrackId === track.id ? 'true' : undefined}
              onClick={() => onPlayTrack(i)}
            >{track.title}</button>
            <time>{track.duration}</time>
          </li>
        ))}
      </ol>
    </div>
  )
}
