import { forwardRef, type CSSProperties, type RefObject } from 'react'
import type { Album, AlbumDisc } from '../../types/album'
import { CASE_HEIGHT, CASE_WIDTH, getAlbumDiscs, getCaseDepth, getSpineDepth, hasObi } from '../../lib/album'
import { getBackCoverArtwork, getDiscArtwork, getInnerArtwork } from '../../lib/generatedCover'
import type { CaseView } from '../../hooks/useAlbumAnimation'
import type { ObiMode } from '../../hooks/useObiAnimation'
import { ObiStrip } from '../ObiStrip/ObiStrip'
import { useTranslation } from '../../i18n'

export const CDCase = forwardRef<
  HTMLDivElement,
  {
    album: Album
    disc?: AlbumDisc
    trayRefs: RefObject<(HTMLDivElement | null)[]>
    view: CaseView
    paperRef: RefObject<HTMLDivElement | null>
    obiMode: ObiMode
    onPlayDisc: () => void
    canPlayDisc: boolean
    ejectedDiscId?: string
  }
>(function CDCase(
  { album, disc, trayRefs, view, paperRef, obiMode, onPlayDisc, canPlayDisc, ejectedDiscId },
  ref,
) {
  const { t } = useTranslation()
  const discs = getAlbumDiscs(album)
  const selected = disc ?? discs[0]
  return (
    <div
      className={`cd-case${obiMode === 'flat' ? ' has-flat-obi' : ''}`}
      ref={ref}
      style={{ '--case-width': `${CASE_WIDTH}px`, '--case-height': `${CASE_HEIGHT}px`, '--case-depth': `${getCaseDepth(album)}px`, '--spine-paper-width': `${getSpineDepth(album)}px` } as CSSProperties}
    >
      <div className="case-body">
        <div className="case-back"><img src={getInnerArtwork(album, 'back')} alt={t('editor.backInsideArtwork')} /></div>
        <div
          className="case-rear"
          aria-hidden={view !== 'back'}
          style={{ background: album.color, color: album.ink }}
        >
          <img
            src={getBackCoverArtwork(album)}
            alt={t('viewer.backCoverArtworkAlt', { title: album.title })}
          />
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
        <div className="case-edge edge-right case-spine-right" style={{ background: album.color, color: album.ink }}>
          {album.rightSpineUrl ? <img className="spine-artwork" src={album.rightSpineUrl} alt="" /> : <span>{album.artist} · {album.title}</span>}
        </div>
        {discs.length > 1 && discs.length % 2 === 1 && (
          <DiscTray album={album} disc={discs[discs.length - 1]} onPlay={discs[discs.length - 1].id === selected.id && canPlayDisc ? onPlayDisc : undefined} ejected={ejectedDiscId === discs[discs.length - 1].id} />
        )}
        {Array.from({ length: Math.max(1, Math.floor(discs.length / 2)) }, (_, index) => {
          const frontDisc = discs[index * 2]
          const backDisc = discs[index * 2 + 1]
          return (
            <div className="tray-leaf" key={frontDisc.id} ref={(element) => { trayRefs.current[index] = element }}>
              <DiscTray album={album} disc={frontDisc} side="front" onPlay={frontDisc.id === selected.id && canPlayDisc ? onPlayDisc : undefined} ejected={ejectedDiscId === frontDisc.id} />
              {backDisc && (
                <DiscTray album={album} disc={backDisc} side="back" onPlay={backDisc.id === selected.id && canPlayDisc ? onPlayDisc : undefined} ejected={ejectedDiscId === backDisc.id} />
              )}
            </div>
          )
        })}
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
            <img src={getInnerArtwork(album, 'booklet')} alt={t('editor.bookletBackArtwork')} />
          </div>
        </div>
        {hasObi(album) && <ObiStrip
          album={album}
          paperRef={paperRef}
          hidden={obiMode === 'hidden'}
        />}
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
          backgroundImage: `url(${getDiscArtwork(album, disc)})`,
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
