import { forwardRef, type CSSProperties, type RefObject } from 'react'
import type { Album, AlbumDisc } from '../../types/album'
import { CASE_HEIGHT, CASE_WIDTH, getAlbumDiscs, getCaseDepth, getSpineDepth, hasObi } from '../../lib/album'
import { getBackCoverArtwork, getDiscArtwork, getInnerArtwork } from '../../lib/generatedCover'
import type { CaseView } from '../../hooks/useAlbumAnimation'
import type { ObiMode } from '../../hooks/useObiAnimation'
import { ObiStrip } from '../ObiStrip/ObiStrip'
import { useTranslation } from '../../i18n'
import { getDiscFormat, getDiscFormatShort } from '../../lib/disc'

const bookletTabPositions = ['top-left', 'top-right', 'bottom-left', 'bottom-right']

export const CDCase = forwardRef<
  HTMLDivElement,
  {
    album: Album
    disc?: AlbumDisc
    trayRefs: RefObject<(HTMLDivElement | null)[]>
    view: CaseView
    isOpen: boolean
    onToggleLid?: () => void
    paperRef: RefObject<HTMLDivElement | null>
    obiMode: ObiMode
    /** 播放指定序号的光盘（含翻开后露出的任意一张）。 */
    onPlayDisc: (index: number) => void
    /** 点击托盘角翻页：选中目标页的光盘但不播放。 */
    onTurnPage: (index: number) => void
    canPlayDisc: boolean
    ejectedDiscId?: string
  }
>(function CDCase(
  { album, disc, trayRefs, view, isOpen, onToggleLid, paperRef, obiMode, onPlayDisc, onTurnPage, canPlayDisc, ejectedDiscId },
  ref,
) {
  const { t } = useTranslation()
  const discs = getAlbumDiscs(album)
  const selected = disc ?? discs[0]
  const selectedIndex = Math.max(0, discs.findIndex((item) => item.id === selected.id))
  // 当前翻到的页：左侧露出 2p-1 号，右侧露出 2p 号。
  const page = Math.ceil(selectedIndex / 2)
  const visible = (index: number) => canPlayDisc && (index === page * 2 - 1 || index === page * 2)
  const play = (index: number) => visible(index) ? () => onPlayDisc(index) : undefined
  const next = canPlayDisc && page * 2 + 1 < discs.length ? () => onTurnPage(page * 2 + 1) : undefined
  const previous = canPlayDisc && page > 0 ? () => onTurnPage(page * 2 - 2) : undefined
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
          <DiscTray album={album} disc={discs[discs.length - 1]} onPlay={play(discs.length - 1)} ejected={ejectedDiscId === discs[discs.length - 1].id} />
        )}
        {Array.from({ length: Math.max(1, Math.floor(discs.length / 2)) }, (_, index) => {
          const frontDisc = discs[index * 2]
          const backDisc = discs[index * 2 + 1]
          return (
            <div className="tray-leaf" key={frontDisc.id} ref={(element) => { trayRefs.current[index] = element }}>
              <DiscTray album={album} disc={frontDisc} side="front" onPlay={play(index * 2)} ejected={ejectedDiscId === frontDisc.id}
                onTurn={index === page ? next : undefined} />
              {backDisc && (
                <DiscTray album={album} disc={backDisc} side="back" onPlay={play(index * 2 + 1)} ejected={ejectedDiscId === backDisc.id}
                  onTurn={index === page - 1 ? previous : undefined} />
              )}
            </div>
          )
        })}
        <span className="selected-disc-label" aria-live="polite">
          {discs.length > 1
            ? `DISC ${selectedIndex + 1} / ${discs.length}${getDiscFormat(selected) === 'cd' ? '' : ` · ${getDiscFormatShort(selected)}`}`
            : getDiscFormat(selected) === 'cd' ? '' : getDiscFormatShort(selected)}
        </span>
        <div className="case-recesses" aria-hidden="true">
          {bookletTabPositions.map((position) => <span key={position} className={`booklet-recess booklet-${position}`} />)}
        </div>
        <div className="case-hinge" aria-hidden="true" />
        <div
          className={`case-lid${isOpen ? ' is-open' : ''}`}
          role="button"
          tabIndex={onToggleLid ? 0 : -1}
          aria-label={t(isOpen ? 'viewer.closeCaseAria' : 'viewer.openCaseAria')}
          aria-disabled={!onToggleLid}
          onClick={onToggleLid}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              onToggleLid?.()
            }
          }}
        >
          <div className="lid-front">
            <img
              src={album.coverUrl}
              alt={t('viewer.coverArtworkAlt', { title: album.title })}
            />
          </div>
          <div className="lid-inside">
            <img src={getInnerArtwork(album, 'booklet')} alt={t('editor.bookletBackArtwork')} />
            <div className="booklet-tabs" aria-hidden="true">
              {bookletTabPositions.map((position) => <span key={position} className={`booklet-tab booklet-${position}`} />)}
            </div>
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
  onTurn,
  ejected,
}: {
  album: Album
  disc: AlbumDisc
  side?: string
  onPlay?: () => void
  /** 正面托盘的右上/右下角向后翻页，背面托盘的左上/左下角向前翻回。 */
  onTurn?: () => void
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
        data-format={getDiscFormat(disc)}
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
      {/* 鼠标翻页用；键盘和读屏可用详情区的光盘按钮完成同样操作。 */}
      {onTurn && (['top', 'bottom'] as const).map((edge) => (
        <div key={edge} className={`tray-corner tray-corner-${edge}`} aria-hidden="true"
          onClick={(event) => { event.stopPropagation(); onTurn() }} />
      ))}
    </div>
  )
}
