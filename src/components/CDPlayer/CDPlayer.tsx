import type { RefObject } from 'react'
import type { Album, AlbumDisc } from '../../types/album'
import { useTranslation } from '../../i18n'
import { formatTime } from '../../lib/audio'
import './CDPlayer.css'

const segments = ['abcdef', 'bc', 'abdeg', 'abcdg', 'bcfg', 'acdfg', 'acdefg', 'abc', 'abcdefg', 'abcdfg']
const paths = [
  'M5 2 L19 2 L22 5 L19 8 L5 8 L2 5 Z',
  'M20 9 L23 6 L26 9 L26 23 L23 26 L20 23 Z',
  'M20 29 L23 26 L26 29 L26 43 L23 46 L20 43 Z',
  'M5 44 L19 44 L22 47 L19 50 L5 50 L2 47 Z',
  'M0 29 L3 26 L6 29 L6 43 L3 46 L0 43 Z',
  'M0 9 L3 6 L6 9 L6 23 L3 26 L0 23 Z',
  'M5 23 L19 23 L22 26 L19 29 L5 29 L2 26 Z',
]

function DigitalTime({ seconds }: { seconds: number }) {
  const value = formatTime(seconds)
  return (
    <span className="digital-time" aria-label={value}>
      {[...value].map((digit, index) => (
        <svg key={index} viewBox={digit === ':' ? '0 0 12 52' : '0 0 28 52'} aria-hidden="true">
          {digit === ':' ? (
            <><circle cx="6" cy="17" r="2.5" /><circle cx="6" cy="35" r="2.5" /></>
          ) : paths.map((path, i) => (
            <path key={path} d={path} className={segments[Number(digit)].includes('abcdefg'[i]) ? 'lit' : 'unlit'} />
          ))}
        </svg>
      ))}
    </span>
  )
}

function TransportIcon({ kind }: { kind: 'play' | 'pause' | 'stop' | 'previous' | 'next' | 'eject' }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      {kind === 'play' && <path d="M7 4v16l13-8z" />}
      {kind === 'pause' && <path d="M6 4h4v16H6zm8 0h4v16h-4z" />}
      {kind === 'stop' && <path d="M5 5h14v14H5z" />}
      {kind === 'previous' && <path d="M4 5h3v14H4zm15 0v14L8 12z" />}
      {kind === 'next' && <path d="M17 5h3v14h-3zM5 5l11 7-11 7z" />}
      {kind === 'eject' && <path d="m12 4 9 12H3zM3 18h18v3H3z" />}
    </svg>
  )
}

export function CDPlayer({
  album, disc, trackIndex, playing, loading, currentTime, duration, volume,
  error, discRef, onPlayPause, onPrevious, onNext, onStop, onEject, onSeek, onVolume,
}: {
  album: Album
  disc: AlbumDisc
  trackIndex: number
  playing: boolean
  loading: boolean
  currentTime: number
  duration: number
  volume: number
  error: string
  discRef: RefObject<HTMLDivElement | null>
  onPlayPause: () => void
  onPrevious: () => void
  onNext: () => void
  onStop: () => void
  onEject: () => void
  onSeek: (time: number) => void
  onVolume: (volume: number) => void
}) {
  const { t } = useTranslation()
  const track = disc.tracks[trackIndex]
  return (
    <section className={`cd-player${loading ? ' is-loading' : ''}`} aria-label={t('player.label')}>
      <i className="player-screw screw-tl" aria-hidden="true" />
      <i className="player-screw screw-tr" aria-hidden="true" />
      <i className="player-screw screw-bl" aria-hidden="true" />
      <i className="player-screw screw-br" aria-hidden="true" />
      <div className="player-brand"><strong>cabinet <span>audio</span></strong><span>CDP–01 · COMPACT DISC PLAYER</span></div>
      <div className="player-body">
        <div className="player-well">
          <div
            ref={discRef}
            className={`disc player-disc${playing ? ' is-spinning' : ''}`}
            style={{ backgroundImage: `url(${disc.labelUrl ?? album.coverUrl})` }}
          ><div className="disc-center" /></div>
          <div className="player-glass" aria-hidden="true" />
          <span className="player-well-label">OPTICAL PICKUP · DIGITAL AUDIO</span>
        </div>
        <div className="player-console">
          <div className="player-display">
            <div className="display-heading"><span>TRACK <b>{String(trackIndex + 1).padStart(2, '0')}</b></span><span className={playing ? 'display-playing' : ''}>● {loading ? t('player.loading') : playing ? t('player.playing') : t('player.ready')}</span></div>
            <DigitalTime seconds={currentTime} />
            <div className="display-track">{track?.title ?? t('player.noAudio')}</div>
            <div className="display-footer"><span>{album.artist}</span><span>−{formatTime(Math.max(0, duration - currentTime))}</span></div>
          </div>
          <label className="player-timeline">
            <span>{t('player.seek')} <time>{formatTime(currentTime)} / {formatTime(duration)}</time></span>
            <input type="range" aria-label={t('player.seek')} min="0" max={duration || 1} step="0.1" value={Math.min(currentTime, duration || 1)} disabled={loading || !duration} onChange={(event) => onSeek(Number(event.target.value))} />
          </label>
          <label className="player-volume"><span>{t('player.volume')}</span><input type="range" min="0" max="1" step="0.01" value={volume} aria-label={t('player.volume')} onChange={(event) => onVolume(Number(event.target.value))} /><span>{Math.round(volume * 100)}</span></label>
        </div>
      </div>
      <div className="player-transport">
        <button disabled={loading || trackIndex <= 0} onClick={onPrevious} aria-label={t('player.previous')}><TransportIcon kind="previous" /><span>{t('player.previous')}</span></button>
        <button className={`play-key${playing ? ' engaged' : ''}`} disabled={loading || !track} onClick={onPlayPause} aria-label={playing ? t('player.pause') : t('player.play')}><TransportIcon kind={playing ? 'pause' : 'play'} /><span>{playing ? t('player.pause') : t('player.play')}</span></button>
        <button disabled={loading || !track} onClick={onStop} aria-label={t('player.stop')}><TransportIcon kind="stop" /><span>{t('player.stop')}</span></button>
        <button disabled={loading || trackIndex >= disc.tracks.length - 1} onClick={onNext} aria-label={t('player.next')}><TransportIcon kind="next" /><span>{t('player.next')}</span></button>
        <button className="eject-key" disabled={loading} onClick={onEject} aria-label={t('player.eject')}><TransportIcon kind="eject" /><span>{t('player.eject')}</span></button>
      </div>
      {error && <p className="player-error" role="alert">{error}</p>}
    </section>
  )
}
