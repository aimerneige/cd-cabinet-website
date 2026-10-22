import { useEffect, useRef, useState } from 'react'
import Cropper, { type Area, type Size } from 'react-easy-crop'
import { cropArtwork, resizeSpineCrop, type ArtworkCrop } from '../../lib/cropArtwork'
import { useTranslation } from '../../i18n'
import 'react-easy-crop/react-easy-crop.css'
import './ArtworkCropper.css'

export function ArtworkCropper({ source, profile, resizeWidth, name, current, total, onComplete }: {
  source: string
  profile: ArtworkCrop
  resizeWidth: boolean
  name: string
  current: number
  total: number
  onComplete: (source: string | null) => void
}) {
  const { t } = useTranslation()
  const dialog = useRef<HTMLDialogElement>(null)
  const image = useRef<HTMLImageElement | null>(null)
  const area = useRef<Area | null>(null)
  const drag = useRef<{ x: number; percent: number; side: 'left' | 'right' } | null>(null)
  const [open, setOpen] = useState(false)
  const [ready, setReady] = useState(false)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [size, setSize] = useState<Size | null>(null)
  const [baseSize, setBaseSize] = useState<Size | null>(null)
  const [mediaSize, setMediaSize] = useState<Size | null>(null)
  const [widthPercent, setWidthPercent] = useState(100)
  const [error, setError] = useState('')
  const activeProfile = resizeWidth ? resizeSpineCrop(profile, widthPercent) : profile
  const cropSize = resizeWidth && baseSize ? { width: baseSize.width * widthPercent / 100, height: baseSize.height } : undefined
  const minZoom = resizeWidth && size && mediaSize
    ? Math.max(1, Math.round(Math.max(size.width / mediaSize.width, size.height / mediaSize.height) * 100000) / 100000) : 1
  useEffect(() => { setZoom((value) => Math.max(value, minZoom)) }, [minZoom])
  useEffect(() => {
    const element = dialog.current!
    element.showModal()
    setOpen(true)
    return () => element.close()
  }, [])
  function apply() {
    if (!image.current || !area.current) return
    try { onComplete(cropArtwork(image.current, area.current, activeProfile)) }
    catch { setError(t('crop.failed')) }
  }
  function changeWidth(percent: number) { setWidthPercent(Math.max(75, Math.min(125, Math.round(percent)))) }
  return (
    <dialog ref={dialog} className="artwork-cropper" aria-labelledby="crop-title"
      onKeyDown={(event) => event.stopPropagation()}
      onCancel={(event) => { event.preventDefault(); event.stopPropagation(); onComplete(null) }}>
      <header>
        <div><h2 id="crop-title">{t('crop.title')}</h2><p title={name}>{name}</p></div>
        <button type="button" aria-label={t('crop.close')} onClick={() => onComplete(null)}>×</button>
      </header>
      <div className="crop-information"><span>{resizeWidth
        ? t('crop.spineWidth', { percent: widthPercent })
        : t('crop.ratio', { ratio: `${profile.width}:${profile.height}` })}</span>
        {total > 1 && <span role="status">{t('crop.progress', { current, total })}</span>}
      </div>
      <div className="crop-stage">
        {open && <Cropper image={source} crop={crop} zoom={zoom} aspect={activeProfile.width / activeProfile.height} cropSize={cropSize} minZoom={minZoom}
          cropShape={profile.round ? 'round' : 'rect'} showGrid={!profile.round} disableAutomaticStylesInjection keyboardStep={10}
          onCropChange={setCrop} onZoomChange={setZoom} setMediaSize={setMediaSize}
          onCropSizeChange={(next) => { setSize(next); if (resizeWidth && !baseSize) setBaseSize(next) }}
          onCropAreaChange={(_, pixels) => { area.current = pixels; setReady(pixels.width > 0 && pixels.height > 0) }}
          setImageRef={(ref) => { image.current = ref.current }}
          mediaProps={{ alt: t('crop.source'), onError: () => { setReady(false); setError(t('crop.failed')) } }}
          cropperProps={{ 'aria-label': t('crop.position') }} />}
        {profile.round && size && <div className="crop-disc-hole" aria-hidden="true" style={{ width: size.width * 0.21, height: size.height * 0.21 }} />}
        {resizeWidth && size && <div className="crop-width-frame" style={{ width: size.width, height: size.height }}>
          {(['left', 'right'] as const).map((side) => <div key={side} className={`crop-width-handle crop-width-${side}`}
            role="slider" tabIndex={0} aria-label={t(side === 'left' ? 'crop.leftEdge' : 'crop.rightEdge')}
            aria-orientation="horizontal" aria-valuemin={75} aria-valuemax={125} aria-valuenow={widthPercent} aria-valuetext={`${widthPercent}%`}
            onPointerDown={(event) => {
              if (event.button !== 0) return
              event.preventDefault(); event.stopPropagation()
              event.currentTarget.focus()
              event.currentTarget.setPointerCapture(event.pointerId)
              drag.current = { x: event.clientX, percent: widthPercent, side }
            }}
            onPointerMove={(event) => {
              if (!drag.current || !baseSize) return
              const delta = (event.clientX - drag.current.x) * (drag.current.side === 'right' ? 1 : -1)
              changeWidth(drag.current.percent + delta * 200 / baseSize.width)
            }}
            onPointerUp={(event) => { drag.current = null; event.currentTarget.releasePointerCapture(event.pointerId) }}
            onPointerCancel={() => { drag.current = null }} onLostPointerCapture={() => { drag.current = null }}
            onKeyDown={(event) => {
              const step = event.shiftKey ? 5 : 1
              const value = event.key === 'Home' ? 75 : event.key === 'End' ? 125
                : event.key === 'ArrowLeft' || event.key === 'ArrowDown' ? widthPercent - step
                : event.key === 'ArrowRight' || event.key === 'ArrowUp' ? widthPercent + step : null
              if (value === null) return
              event.preventDefault(); event.stopPropagation(); changeWidth(value)
            }} />)}
        </div>}
      </div>
      <p className="crop-guidance">{t(resizeWidth ? 'crop.spineGuidance' : 'crop.guidance')}</p>
      <label className="crop-zoom">{t('crop.zoom')}<input type="range" min={minZoom} max="3" step="0.01" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /></label>
      {error && <p className="editor-error" role="alert">{error}</p>}
      <div className="crop-actions">
        <button type="button" onClick={() => { setWidthPercent(100); setCrop({ x: 0, y: 0 }); setZoom(1); setError('') }}>{t('crop.reset')}</button>
        <div><button type="button" onClick={() => onComplete(null)}>{t('crop.cancel')}</button>
          <button type="button" className="crop-apply" disabled={!ready} onClick={apply}>{t('crop.apply')}</button></div>
      </div>
    </dialog>
  )
}
