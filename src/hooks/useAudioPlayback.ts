import { useEffect, useRef, useState } from 'react'
import type { AlbumDisc } from '../types/album'
import { useTranslation } from '../i18n'

export function useAudioPlayback() {
  const { t } = useTranslation()
  const audioRef = useRef<HTMLAudioElement>(null)
  const source = useRef('')
  const request = useRef(0)
  const [disc, setDisc] = useState<AlbumDisc | null>(null)
  const [trackIndex, setTrackIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.7)
  const [error, setError] = useState('')

  useEffect(() => {
    const audio = audioRef.current!
    return () => {
      request.current += 1
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
      if (source.current) URL.revokeObjectURL(source.current)
      source.current = ''
    }
  }, [])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  function play() {
    const audio = audioRef.current!
    const token = ++request.current
    setError('')
    void audio.play().catch((cause: unknown) => {
      if (token !== request.current) return
      setPlaying(false)
      setError(cause instanceof DOMException && cause.name === 'AbortError' ? '' : t('player.playFailed'))
    })
  }

  function loadTrack(nextDisc: AlbumDisc, index: number) {
    const audio = audioRef.current!
    request.current += 1
    audio.pause()
    audio.removeAttribute('src')
    if (source.current) URL.revokeObjectURL(source.current)
    source.current = ''
    setDisc(nextDisc)
    setTrackIndex(index)
    setCurrentTime(0)
    setDuration(0)
    setPlaying(false)
    const track = nextDisc.tracks[index]
    if (!track?.audio) {
      audio.load()
      setError(t(track ? 'player.missingTrack' : 'player.noAudio'))
      return
    }
    source.current = URL.createObjectURL(track.audio)
    audio.src = source.current
    audio.load()
    // 在点击事件内启动音频，保留移动浏览器的用户播放授权。
    play()
  }

  function stop() {
    request.current += 1
    const audio = audioRef.current!
    audio.pause()
    if (audio.readyState) audio.currentTime = 0
    setCurrentTime(0)
    setPlaying(false)
  }

  function playPause() {
    if (!disc?.tracks[trackIndex]?.audio) {
      setError(t('player.missingTrack'))
      return
    }
    if (!audioRef.current!.paused) {
      request.current += 1
      audioRef.current!.pause()
    } else play()
  }

  function selectTrack(index: number) {
    if (disc && index >= 0 && index < disc.tracks.length) loadTrack(disc, index)
  }

  function seek(time: number) {
    const audio = audioRef.current!
    if (!Number.isFinite(audio.duration) || !audio.duration) return
    audio.currentTime = Math.min(Math.max(0, time), audio.duration)
    setCurrentTime(audio.currentTime)
  }

  function updateDuration() {
    const value = audioRef.current!.duration
    setDuration(Number.isFinite(value) ? value : 0)
  }

  return {
    audioRef, disc, trackIndex, playing, currentTime, duration, volume, error,
    loadTrack, selectTrack, playPause, stop, seek, setVolume,
    audioEvents: {
      onTimeUpdate: () => setCurrentTime(audioRef.current!.currentTime),
      onLoadedMetadata: updateDuration,
      onDurationChange: updateDuration,
      onPlaying: () => setPlaying(true),
      onPause: () => setPlaying(false),
      onWaiting: () => setPlaying(false),
      onEnded: () => {
        if (disc && trackIndex < disc.tracks.length - 1) selectTrack(trackIndex + 1)
        else stop()
      },
      onError: () => {
        if (!source.current) return
        setPlaying(false)
        setError(t('player.playFailed'))
      },
    },
  }
}
