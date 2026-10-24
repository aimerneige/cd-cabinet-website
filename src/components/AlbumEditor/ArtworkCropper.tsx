import { useEffect, useRef, useState } from 'react'
import Cropper, { type Area, type Size } from 'react-easy-crop'
import { cropArtwork, getArtworkCrop, getSpineCrop, type ArtworkCrop, type ArtworkCropResult } from '../../lib/cropArtwork'
import { clampSpineWidthMm, getCaseThicknessMm, MAX_SPINE_WIDTH_MM, MIN_SPINE_WIDTH_MM, SPINE_HEIGHT_MM } from '../../lib/album'
import { getObiLayout } from '../../lib/obi'
import type { Album, ObiDimensions } from '../../types/album'
import { ObiSizeControls } from './ObiSizeControls'
import { useTranslation } from '../../i18n'
import 'react-easy-crop/react-easy-crop.css'
import './ArtworkCropper.css'

export function ArtworkCropper({ source, profile, resizeWidth, obi, name, current, total, onComplete }: {
  source: string
  profile: ArtworkCrop
  resizeWidth: boolean
  obi?: Pick<Album, 'discs' | 'caseThicknessMm' | 'obiDimensions'>
  name: string
  current: number
  total: number
  onComplete: (result: ArtworkCropResult | null) => void
}) {
  const { t } = useTranslation()
  const dialog = useRef<HTMLDialogElement>(null)
  const image = useRef<HTMLImageElement | null>(null)
  const area = useRef<Area | null>(null)
  const [open, setOpen] = useState(false)
  const [ready, setReady] = useState(false)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [size, setSize] = useState<Size | null>(null)
  const [baseSize, setBaseSize] = useState<Size | null>(null)
  const [mediaSize, setMediaSize] = useState<Size | null>(null)
  const defaultWidthMm = clampSpineWidthMm(profile.width / profile.height * SPINE_HEIGHT_MM)
  const [widthMm, setWidthMm] = useState(defaultWidthMm)
  const [obiDimensions, setObiDimensions] = useState<ObiDimensions | undefined>(obi?.obiDimensions)
  const [caseThicknessMm, setCaseThicknessMm] = useState(obi?.caseThicknessMm)
  const [error, setError] = useState('')
  const obiAlbum = obi ? { ...obi, obiDimensions, caseThicknessMm } : undefined
  const obiLayout = obiAlbum ? getObiLayout(obiAlbum) : undefined
  const activeProfile = resizeWidth ? getSpineCrop(widthMm) : obiAlbum ? getArtworkCrop('obi', obiAlbum) : profile
  const cropSize = resizeWidth && baseSize ? { width: baseSize.width * widthMm / defaultWidthMm, height: baseSize.height } : undefined
  const minZoom = resizeWidth && size && mediaSize
    ? Math.max(1, Math.round(Math.max(size.width / mediaSize.width, size.height / mediaSize.height) * 100000) / 100000) : 1
  const maxZoom = Math.max(3, minZoom * 3)
  useEffect(() => { setZoom((value) => Math.min(maxZoom, Math.max(value, minZoom))) }, [minZoom, maxZoom])
  useEffect(() => {
    const element = dialog.current!
    element.showModal()
    setOpen(true)
    return () => element.close()
  }, [])
  function apply() {
    if (!image.current || !area.current) return
    try { onComplete({ source: cropArtwork(image.current, area.current, activeProfile), ...(resizeWidth ? { spineWidthMm: widthMm } : {}), ...(obiAlbum ? { obiDimensions, caseThicknessMm: getCaseThicknessMm(obiAlbum) } : {}) }) }
    catch { setError(t('crop.failed')) }
  }
  return (
    <dialog ref={dialog} className={`artwork-cropper${obi ? ' has-obi-controls' : ''}`} aria-labelledby="crop-title"
      onKeyDown={(event) => event.stopPropagation()}
      onCancel={(event) => { event.preventDefault(); event.stopPropagation(); onComplete(null) }}>
      <header>
        <div><h2 id="crop-title">{t('crop.title')}</h2><p title={name}>{name}</p></div>
        <button type="button" aria-label={t('crop.close')} onClick={() => onComplete(null)}>×</button>
      </header>
      <div className="crop-information"><span>{resizeWidth
        ? t('crop.spineRange', { min: MIN_SPINE_WIDTH_MM, max: MAX_SPINE_WIDTH_MM })
        : obiLayout ? t('obi.cropSize', { width: (obiLayout.width * SPINE_HEIGHT_MM / 300).toFixed(1), height: (obiLayout.height * SPINE_HEIGHT_MM / 300).toFixed(1) })
        : t('crop.ratio', { ratio: `${profile.width}:${profile.height}` })}</span>
        {total > 1 && <span role="status">{t('crop.progress', { current, total })}</span>}
      </div>
      <div className="crop-stage">
        {open && <Cropper image={source} crop={crop} zoom={zoom} aspect={activeProfile.width / activeProfile.height} cropSize={cropSize} minZoom={minZoom} maxZoom={maxZoom}
          cropShape={profile.round ? 'round' : 'rect'} showGrid={!profile.round} disableAutomaticStylesInjection keyboardStep={10}
          onCropChange={setCrop} onZoomChange={setZoom} setMediaSize={setMediaSize}
          onCropSizeChange={(next) => { setSize(next); if (resizeWidth && !baseSize) setBaseSize(next) }}
          onCropAreaChange={(_, pixels) => { area.current = pixels; setReady(pixels.width > 0 && pixels.height > 0) }}
          setImageRef={(ref) => { image.current = ref.current }}
          mediaProps={{ alt: t('crop.source'), onError: () => { setReady(false); setError(t('crop.failed')) } }}
          cropperProps={{ 'aria-label': t('crop.position') }} />}
        {profile.round && size && <div className="crop-disc-hole" aria-hidden="true" style={{ width: size.width * 0.21, height: size.height * 0.21 }} />}
        {obiLayout && size && <div className="crop-obi-folds" aria-hidden="true" style={{ width: size.width, height: size.height }}>
          <span style={{ left: `${obiLayout.backWidth / obiLayout.width * 100}%` }} />
          <span style={{ left: `${(obiLayout.backWidth + obiLayout.depth) / obiLayout.width * 100}%` }} />
          <div className="crop-obi-panel" style={{ left: 0, width: `${obiLayout.backWidth / obiLayout.width * 100}%` }}>{t('obi.back')}</div>
          <div className="crop-obi-panel" style={{ left: `${obiLayout.backWidth / obiLayout.width * 100}%`, width: `${obiLayout.depth / obiLayout.width * 100}%` }}>{t('obi.side')}</div>
          <div className="crop-obi-panel" style={{ left: `${(obiLayout.backWidth + obiLayout.depth) / obiLayout.width * 100}%`, width: `${obiLayout.frontWidth / obiLayout.width * 100}%` }}>{t('obi.front')}</div>
        </div>}
      </div>
      <p className="crop-guidance">{t(resizeWidth ? 'crop.spineGuidance' : obiLayout ? 'obi.cropGuidance' : 'crop.guidance')}</p>
      {resizeWidth && <label className="crop-zoom">{t('crop.spineWidth', { width: widthMm.toFixed(1) })}
        <input type="range" aria-label={t('crop.spineWidthLabel')} aria-valuetext={`${widthMm.toFixed(1)} mm`} min={MIN_SPINE_WIDTH_MM} max={MAX_SPINE_WIDTH_MM} step="0.1" value={widthMm}
          onChange={(event) => setWidthMm(clampSpineWidthMm(Number(event.target.value)))} /></label>}
      {obiAlbum && <ObiSizeControls dimensions={obiDimensions} thicknessMm={getCaseThicknessMm(obiAlbum)} disabled={!ready} onChange={setObiDimensions} onThicknessChange={setCaseThicknessMm} />}
      <label className="crop-zoom">{t('crop.zoom')}<input type="range" min={minZoom} max={maxZoom} step="0.01" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /></label>
      {error && <p className="editor-error" role="alert">{error}</p>}
      <div className="crop-actions">
        <button type="button" onClick={() => { setWidthMm(defaultWidthMm); setObiDimensions(obi?.obiDimensions); setCaseThicknessMm(obi?.caseThicknessMm); setCrop({ x: 0, y: 0 }); setZoom(1); setError('') }}>{t('crop.reset')}</button>
        <div><button type="button" onClick={() => onComplete(null)}>{t('crop.cancel')}</button>
          <button type="button" className="crop-apply" disabled={!ready} onClick={apply}>{t('crop.apply')}</button></div>
      </div>
    </dialog>
  )
}
