import { forwardRef, type RefObject } from 'react'
import type { Album, AlbumDisc } from '../../types/album'
import { getAlbumDiscs } from '../../lib/album'
import type { CaseView } from '../../hooks/useAlbumAnimation'
import type { ObiMode } from '../../hooks/useObiAnimation'
import { ObiStrip } from '../ObiStrip/ObiStrip'
import { useTranslation } from '../../i18n'

export const CDCase = forwardRef<
  HTMLDivElement,
  {
    album: Album
    disc?: AlbumDisc
    frontDisc: AlbumDisc
    backDisc: AlbumDisc
    trayRef: RefObject<HTMLDivElement | null>
    view: CaseView
    paperRef: RefObject<HTMLDivElement | null>
    obiMode: ObiMode
    onPlayDisc: () => void
    canPlayDisc: boolean
    ejectedDiscId?: string
  }
>(function CDCase(
  { album, disc, frontDisc, backDisc, trayRef, view, paperRef, obiMode, onPlayDisc, canPlayDisc, ejectedDiscId },
  ref,
) {
  const { t } = useTranslation()
  const discs = getAlbumDiscs(album)
  const selected = disc ?? discs[0]
  return (
    <div
      className={`cd-case${obiMode === 'flat' ? ' has-flat-obi' : ''}`}
      ref={ref}
    >
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
              alt={t('viewer.backCoverArtworkAlt', { title: album.title })}
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
        {discs.length === 3 && <DiscTray album={album} disc={discs[2]} onPlay={discs[2].id === selected.id && canPlayDisc ? onPlayDisc : undefined} ejected={ejectedDiscId === discs[2].id} />}
        <div className="tray-leaf" ref={trayRef}>
          <DiscTray album={album} disc={frontDisc} side="front" onPlay={frontDisc.id === selected.id && canPlayDisc ? onPlayDisc : undefined} ejected={ejectedDiscId === frontDisc.id} />
          {discs.length > 1 && (
            <DiscTray album={album} disc={backDisc} side="back" onPlay={backDisc.id === selected.id && canPlayDisc ? onPlayDisc : undefined} ejected={ejectedDiscId === backDisc.id} />
          )}
        </div>
        <span className="selected-disc-label" aria-live="polite">
          {discs.length > 1
            ? `DISC ${discs.findIndex((item) => item.id === selected.id) + 1} / ${discs.length}`
            : ''}
        </span>
        <div className="case-lid">
          <div className="lid-front">
            <img
              src={album.coverUrl}
              alt={t('viewer.coverArtworkAlt', { title: album.title })}
            />
          </div>
          <div className="lid-inside">
            <img src={album.coverUrl} alt="" />
            <span>ORIGINAL RECORDINGS · {album.year}</span>
          </div>
        </div>
        <ObiStrip
          album={album}
          paperRef={paperRef}
          hidden={obiMode === 'hidden'}
        />
      </div>
    </div>
  )
})

function DiscTray({
  album,
  disc,
  side = 'base',
  onPlay,
  ejected,
}: {
  album: Album
  disc: AlbumDisc
  side?: string
  onPlay?: () => void
  ejected?: boolean
}) {
  const { t } = useTranslation()
  const discs = getAlbumDiscs(album)
  return (
    <div className={`disc-tray tray-${side}`}>
      <div className="tray-ring" />
      <div
        className={`disc${ejected ? ' is-ejected' : ''}`}
        data-disc-id={disc.id}
        role={onPlay ? 'button' : undefined}
        tabIndex={onPlay ? 0 : undefined}
        aria-label={onPlay ? t('player.playDisc', { number: discs.findIndex((item) => item.id === disc.id) + 1 }) : undefined}
        onClick={onPlay}
        onKeyDown={onPlay ? (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onPlay()
          }
        } : undefined}
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
