import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { useDiscAnimation } from '../../hooks/useDiscAnimation'
import type { Album, AlbumDisc } from '../../types/album'
import { useAlbumAnimation } from '../../hooks/useAlbumAnimation'
import type { Origin } from '../../hooks/useAlbumAnimation'
import { CDCase } from '../CDCase/CDCase'
import { AlbumDetails } from '../AlbumDetails/AlbumDetails'
import { getAlbumDiscs, getCaseDepth } from '../../lib/album'
import { useObiAnimation } from '../../hooks/useObiAnimation'
import { useTranslation } from '../../i18n'
import type { AudioPlayback } from '../../hooks/useAudioPlayback'
import { CDPlayer, CompactPlayer } from '../CDPlayer/CDPlayer'

export function ActiveCD({
  album,
  origin,
  onReturned,
  onEdit,
  playback,
}: {
  album: Album
  origin: Origin
  onReturned: () => void
  onEdit: (id: string) => void
  playback: AudioPlayback
}) {
  const { t } = useTranslation()
  const discs = getAlbumDiscs(album)
  const loadedIndex = playback.album?.id === album.id
    ? discs.findIndex((item) => item.id === playback.disc?.id)
    : -1
  const [playerOpen, setPlayerOpen] = useState(loadedIndex >= 0)
  const [isLoadingDisc, setIsLoadingDisc] = useState(false)
  const [startingPlayback, setStartingPlayback] = useState(false)
  const startFrame = useRef<number | null>(null)
  const playerDisc = useRef<HTMLDivElement>(null)
  const transferAnimation = useRef<gsap.core.Timeline | null>(null)
  const ghosts = useRef<HTMLElement[]>([])
  const discOrigin = useRef<DOMRect | null>(null)
  const outgoingDisc = useRef<{ album: Album; disc: AlbumDisc } | null>(null)
  const closing = useRef(false)
  const pendingPlay = useRef(false)
  const pendingDisc = useRef<number | null>(null)
  const {
    trayRef,
    frontDisc,
    backDisc,
    discIndex,
    isTurning,
    selectDisc,
    resetTray,
  } = useDiscAnimation(discs, Math.max(0, loadedIndex))
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
    if (startFrame.current !== null) cancelAnimationFrame(startFrame.current)
    startFrame.current = null
    transferAnimation.current?.kill()
    transferAnimation.current = null
    ghosts.current.forEach((copy) => copy.remove())
    ghosts.current = []
    discOrigin.current = null
    outgoingDisc.current = null
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
    ghosts.current.push(copy)
    return copy
  }
  function showPlayer() {
    discOrigin.current = getCaseDisc().getBoundingClientRect()
    setIsLoadingDisc(true)
    setPlayerOpen(true)
  }
  function playTrack(index: number) {
    if (closing.current || isLoadingDisc || startingPlayback || pendingPlay.current) return
    if (playback.disc?.id === disc.id) {
      playback.selectTrack(index)
      setPlayerOpen(true)
      return
    }
    if (playback.album && playback.disc) outgoingDisc.current = { album: playback.album, disc: playback.disc }
    playback.loadDisc(album, disc, index)
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
    if (!playerOpen) return
    if (!discOrigin.current) {
      gsap.set(caseRef.current, { autoAlpha: 0 })
      return
    }
    const target = playerDisc.current!
    const rect = target.getBoundingClientRect()
    const player = target.closest('.cd-player')!
    const finish = () => {
      clearTransfer()
      setIsLoadingDisc(false)
      if (playback.disc?.tracks[playback.trackIndex]?.audio) {
        setStartingPlayback(true)
        // 先让入碟后的旋转绘制一帧，再启动音乐。
        startFrame.current = requestAnimationFrame(() => {
          startFrame.current = requestAnimationFrame(() => {
            startFrame.current = null
            if (!closing.current) playback.play()
          })
        })
      }
      player.querySelector<HTMLButtonElement>('.play-key')?.focus({ preventScroll: true })
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set(caseRef.current, { autoAlpha: 0 })
      finish()
      return
    }
    const copy = createGhost(getCaseDisc(), discOrigin.current)
    gsap.set(player, { opacity: 0 })
    const tl = gsap.timeline({ onComplete: finish })
    transferAnimation.current = tl
    const offset = outgoingDisc.current ? 0.6 : 0
    if (outgoingDisc.current) {
      const previous = createGhost(target, rect)
      previous.classList.add('is-outgoing')
      previous.style.backgroundImage = `url(${outgoingDisc.current.disc.labelUrl ?? outgoingDisc.current.album.coverUrl})`
      gsap.set(copy, { autoAlpha: 0 })
      tl.to(player, { opacity: 1, duration: 0.2 }, 0)
        .to(previous, { y: '-=55', rotation: -20, duration: 0.3, ease: 'power2.out' }, 0)
        .to(previous, { x: '-=100', autoAlpha: 0, duration: 0.3, ease: 'power2.in' }, 0.3)
        .set(copy, { autoAlpha: 1 }, offset)
    }
    tl.to(copy, { y: '-=65', scale: 1.08, rotation: -18, duration: 0.3, ease: 'power2.out' }, offset)
      .to(caseRef.current, { autoAlpha: 0, duration: 0.3 }, offset + 0.2)
      .to(player, { opacity: 1, duration: 0.35 }, offset + 0.3)
      .to(copy, { x: rect.x, y: rect.y, width: rect.width, height: rect.height, scale: 1, rotation: 0, duration: 0.65, ease: 'power2.inOut' }, offset + 0.3)
  }, [playerOpen])

  useEffect(() => {
    if (playback.playing || playback.error) setStartingPlayback(false)
  }, [playback.playing, playback.error])

  useEffect(() => () => clearTransfer(), [])

  function returnDisc(after?: () => void) {
    clearTransfer()
    setStartingPlayback(false)
    playback.stop()
    if (!playerOpen) {
      playback.eject()
      after?.()
      return
    }
    setIsLoadingDisc(true)
    const target = getCaseDisc()
    const finish = () => {
      clearTransfer()
      gsap.set(caseRef.current, { autoAlpha: 1 })
      playback.eject()
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
  function selectAlbumDisc(index: number) {
    if (closing.current || isLoadingDisc || isTurning || index === discIndex) return
    if (playerOpen) {
      pendingDisc.current = index
      returnDisc(() => selectDisc(index))
    } else selectDisc(index)
  }
  useEffect(() => {
    if (pendingDisc.current === discIndex && !isTurning && !isLoadingDisc) {
      pendingDisc.current = null
      if (!closing.current) playTrack(0)
    }
  }, [discIndex, isTurning, isLoadingDisc])

  const close = () => {
    if (closing.current) return
    closing.current = true
    const cancelled = pendingPlay.current || isLoadingDisc || startingPlayback
    pendingPlay.current = false
    pendingDisc.current = null
    if (cancelled) returnDisc(closeViewer)
    else {
      clearTransfer()
      setPlayerOpen(false)
      gsap.set(caseRef.current, { autoAlpha: 1 })
      closeViewer()
    }
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
            {playerOpen ? t('player.collapse') : t('viewer.close')} <span>×</span>
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
        ejectedDiscId={playback.album?.id === album.id ? playback.disc?.id : undefined}
      />
      {playerOpen && playback.disc && (
        <CDPlayer
          album={album}
          disc={playback.disc}
          trackIndex={playback.trackIndex}
          playing={playback.playing}
          spinning={playback.playing || startingPlayback}
          loading={isLoadingDisc}
          currentTime={playback.currentTime}
          duration={playback.duration}
          volume={playback.volume}
          error={playback.error}
          discRef={playerDisc}
          onPlayPause={playback.playPause}
          onPrevious={() => playback.selectTrack(playback.trackIndex - 1)}
          onNext={() => playback.selectTrack(playback.trackIndex + 1)}
          onStop={() => {
            clearTransfer()
            setStartingPlayback(false)
            playback.stop()
          }}
          onEject={() => returnDisc()}
          onSeek={playback.seek}
          onVolume={playback.setVolume}
        />
      )}
      {!playerOpen && !pendingPlay.current && playback.disc && <CompactPlayer playback={playback} />}
      <AlbumDetails
        album={album}
        disc={disc}
        onSelectDisc={selectAlbumDisc}
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
