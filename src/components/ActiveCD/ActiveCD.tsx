import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { useDiscAnimation } from '../../hooks/useDiscAnimation'
import type { Album } from '../../types/album'
import { useAlbumAnimation } from '../../hooks/useAlbumAnimation'
import type { Origin } from '../../hooks/useAlbumAnimation'
import { CDCase } from '../CDCase/CDCase'
import { AlbumDetails } from '../AlbumDetails/AlbumDetails'
import { getAlbumDiscs, getCaseDepth } from '../../lib/album'
import { useObiAnimation } from '../../hooks/useObiAnimation'
import { useTranslation } from '../../i18n'
import { useAudioPlayback } from '../../hooks/useAudioPlayback'
import { CDPlayer } from '../CDPlayer/CDPlayer'

export function ActiveCD({
  album,
  origin,
  onReturned,
  onEdit,
}: {
  album: Album
  origin: Origin
  onReturned: () => void
  onEdit: (id: string) => void
}) {
  const { t } = useTranslation()
  const playback = useAudioPlayback()
  const [playerOpen, setPlayerOpen] = useState(false)
  const [isLoadingDisc, setIsLoadingDisc] = useState(false)
  const playerDisc = useRef<HTMLDivElement>(null)
  const transferAnimation = useRef<gsap.core.Timeline | null>(null)
  const ghost = useRef<HTMLElement | null>(null)
  const discOrigin = useRef<DOMRect | null>(null)
  const closing = useRef(false)
  const pendingPlay = useRef(false)
  const discs = getAlbumDiscs(album)
  const {
    trayRef,
    frontDisc,
    backDisc,
    discIndex,
    isTurning,
    selectDisc,
    resetTray,
  } = useDiscAnimation(discs)
  const disc = discs[discIndex] ?? discs[0]
  const {
    layer,
    caseRef,
    close: closeCase,
    view,
    isOpen,
    isChangingView,
    selectView,
  } = useAlbumAnimation(origin, getCaseDepth(album), onReturned)
  const {
    paperRef,
    mode: obiMode,
    isMoving,
    selectMode,
    resetObi,
  } = useObiAnimation(caseRef, getCaseDepth(album))
  const closeViewer = () => {
    closeCase((onFolded) => resetObi(() => resetTray(onFolded)))
  }
  function clearTransfer() {
    transferAnimation.current?.kill()
    transferAnimation.current = null
    ghost.current?.remove()
    ghost.current = null
  }
  function getCaseDisc() {
    return [...caseRef.current!.querySelectorAll<HTMLElement>('[data-disc-id]')]
      .find((element) => element.dataset.discId === disc.id)!
  }
  function createGhost(element: HTMLElement, rect: DOMRect) {
    const copy = element.cloneNode(true) as HTMLElement
    copy.className = 'disc disc-transfer'
    copy.removeAttribute('role')
    copy.removeAttribute('tabindex')
    copy.removeAttribute('aria-label')
    copy.removeAttribute('data-disc-id')
    copy.setAttribute('aria-hidden', 'true')
    layer.current!.append(copy)
    gsap.set(copy, { left: 0, top: 0, x: rect.x, y: rect.y, width: rect.width, height: rect.height })
    ghost.current = copy
    return copy
  }
  function showPlayer() {
    discOrigin.current = getCaseDisc().getBoundingClientRect()
    setIsLoadingDisc(true)
    setPlayerOpen(true)
  }
  function playTrack(index: number) {
    if (closing.current || isLoadingDisc) return
    playback.loadTrack(disc, index)
    if (playerOpen) return
    if (view !== 'inside' || obiMode === 'flat') {
      pendingPlay.current = true
      selectMode('hidden', () => selectView('inside'))
    } else showPlayer()
  }
  useEffect(() => {
    if (pendingPlay.current && view === 'inside' && obiMode !== 'flat' && !isChangingView && !isMoving) {
      pendingPlay.current = false
      if (!closing.current) showPlayer()
    }
  }, [view, obiMode, isChangingView, isMoving])

  useLayoutEffect(() => {
    if (!playerOpen) return
    layer.current!.scrollTop = 0
    const player = playerDisc.current!.closest('.cd-player')!
    const resize = () => layer.current?.style.setProperty('--player-height', `${player.getBoundingClientRect().height}px`)
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(player)
    return () => observer.disconnect()
  }, [playerOpen])

  useLayoutEffect(() => {
    if (!playerOpen || !discOrigin.current) return
    const target = playerDisc.current!
    const rect = target.getBoundingClientRect()
    const player = target.closest('.cd-player')!
    const finish = () => {
      ghost.current?.remove()
      ghost.current = null
      transferAnimation.current = null
      setIsLoadingDisc(false)
      player.querySelector<HTMLButtonElement>('.play-key')?.focus({ preventScroll: true })
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set(caseRef.current, { autoAlpha: 0 })
      finish()
      return
    }
    const copy = createGhost(getCaseDisc(), discOrigin.current)
    gsap.set(player, { opacity: 0 })
    transferAnimation.current = gsap.timeline({ onComplete: finish })
      .to(copy, { y: '-=65', scale: 1.08, rotation: -18, duration: 0.3, ease: 'power2.out' })
      .to(caseRef.current, { autoAlpha: 0, duration: 0.3 }, 0.2)
      .to(player, { opacity: 1, duration: 0.35 }, 0.3)
      .to(copy, { x: rect.x, y: rect.y, width: rect.width, height: rect.height, scale: 1, rotation: 0, duration: 0.65, ease: 'power2.inOut' }, 0.3)
  }, [playerOpen])

  useEffect(() => () => clearTransfer(), [])

  function returnDisc(after?: () => void) {
    clearTransfer()
    playback.stop()
    if (!playerOpen) {
      after?.()
      return
    }
    setIsLoadingDisc(true)
    const target = getCaseDisc()
    const finish = () => {
      clearTransfer()
      gsap.set(caseRef.current, { autoAlpha: 1 })
      setPlayerOpen(false)
      setIsLoadingDisc(false)
      if (after) after()
      else requestAnimationFrame(() => target.focus({ preventScroll: true }))
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finish()
      return
    }
    const copy = createGhost(playerDisc.current!, playerDisc.current!.getBoundingClientRect())
    const rect = target.getBoundingClientRect()
    transferAnimation.current = gsap.timeline({ onComplete: finish })
      .to(copy, { y: '-=40', duration: 0.2, ease: 'power2.out' })
      .to(playerDisc.current!.closest('.cd-player'), { autoAlpha: 0, duration: 0.25 }, 0.1)
      .to(caseRef.current, { autoAlpha: 1, duration: 0.3 }, 0.3)
      .to(copy, { x: rect.x, y: rect.y, width: rect.width, height: rect.height, duration: 0.55, ease: 'power2.inOut' }, 0.2)
  }
  const close = () => {
    if (closing.current) return
    closing.current = true
    pendingPlay.current = false
    returnDisc(closeViewer)
  }
  const button = useRef<HTMLButtonElement>(null)
  const closeRef = useRef(close)
  closeRef.current = close
  useEffect(() => {
    const source = document.querySelector<HTMLButtonElement>(
      `[data-album-id="${album.id}"]`,
    )
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    button.current?.focus({ preventScroll: true })
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current()
      if (event.key === 'Tab') {
        const controls = [
          ...layer.current!.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]',
          ),
        ].filter(
          (element) => element.getClientRects().length && !element.hidden && getComputedStyle(element).visibility !== 'hidden',
        )
        const first = controls[0]
        const last = controls[controls.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }
    }
    window.addEventListener('keydown', keydown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', keydown)
      requestAnimationFrame(() => source?.focus({ preventScroll: true }))
    }
  }, [album.id])
  return (
    <div
      ref={layer}
      className={`active-layer${playerOpen ? ' has-player' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={t('viewer.dialogAria', {
        title: album.title,
        artist: album.artist,
      })}
    >
      <div className="collection-overlay" onClick={close} />
      <audio ref={playback.audioRef} {...playback.audioEvents} preload="metadata" />
      <div className="viewer-controls">
        <span>{t('viewer.closerLook')}</span>
        <div className="viewer-actions">
          <button
            onClick={() => {
              onEdit(album.id)
              close()
            }}
          >
            {t('viewer.editRecording')}
          </button>
          <button
            ref={button}
            onClick={close}
            aria-label={t('viewer.closeAlbumAria')}
          >
            {t('viewer.close')} <span>×</span>
          </button>
        </div>
      </div>
      <CDCase
        album={album}
        disc={disc}
        frontDisc={frontDisc}
        backDisc={backDisc}
        trayRef={trayRef}
        ref={caseRef}
        view={view}
        paperRef={paperRef}
        obiMode={obiMode}
        onPlayDisc={() => playTrack(0)}
        canPlayDisc={!isTurning && !isChangingView && !isMoving && !playerOpen && view === 'inside' && obiMode !== 'flat'}
        ejectedDiscId={playerOpen ? disc.id : undefined}
      />
      {playerOpen && playback.disc && (
        <CDPlayer
          album={album}
          disc={playback.disc}
          trackIndex={playback.trackIndex}
          playing={playback.playing}
          loading={isLoadingDisc}
          currentTime={playback.currentTime}
          duration={playback.duration}
          volume={playback.volume}
          error={playback.error}
          discRef={playerDisc}
          onPlayPause={playback.playPause}
          onPrevious={() => playback.selectTrack(playback.trackIndex - 1)}
          onNext={() => playback.selectTrack(playback.trackIndex + 1)}
          onStop={playback.stop}
          onEject={() => returnDisc()}
          onSeek={playback.seek}
          onVolume={playback.setVolume}
        />
      )}
      <AlbumDetails
        album={album}
        disc={disc}
        onSelectDisc={selectDisc}
        isTurning={isTurning || isChangingView || isMoving || isLoadingDisc}
        isPlayingDisc={playerOpen}
        onPlayTrack={playTrack}
        currentTrackId={playerOpen ? playback.disc?.tracks[playback.trackIndex]?.id : undefined}
        view={view}
        onSelectView={(next) => {
          if (next === 'inside') selectMode('hidden', () => selectView(next))
          else selectView(next)
        }}
        isOpen={isOpen}
        obiMode={obiMode}
        onSelectObi={selectMode}
      />
    </div>
  )
}
