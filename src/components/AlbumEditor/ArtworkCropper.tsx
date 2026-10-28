import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Cropper, { type Area, type Size } from 'react-easy-crop'
import { cropArtwork, getArtworkCrop, getRotatedSize, getSpineCrop, type ArtworkCrop, type ArtworkCropResult } from '../../lib/cropArtwork'
import { clampSpineWidthMm, getCaseThicknessMm, MAX_SPINE_WIDTH_MM, MIN_SPINE_WIDTH_MM, SPINE_HEIGHT_MM } from '../../lib/album'
import { getObiDimensions, getObiLayout } from '../../lib/obi'
import { LABEL_INNER_RATIO, LABEL_OUTER_RATIO } from '../../lib/disc'
import type { Album, ObiDimensions } from '../../types/album'
import { ObiSizeControls } from './ObiSizeControls'
import { PreciseRange } from './PreciseRange'
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
  const areaPercent = useRef<Area | null>(null)
  // 调侧封宽度时，若裁剪框贴着图片左/右边缘，就保持贴边，只往另一侧伸缩。
  // 'center' 表示按中心伸缩，但仍把框限制在图片内；null 表示当前没有在调宽度。
  const anchor = useRef<'left' | 'right' | 'center' | null>(null)
  const [open, setOpen] = useState(false)
  const [ready, setReady] = useState(false)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [size, setSize] = useState<Size | null>(null)
  const [baseSize, setBaseSize] = useState<Size | null>(null)
  const [mediaSize, setMediaSize] = useState<Size | null>(null)
  const defaultWidthMm = clampSpineWidthMm(profile.width / profile.height * SPINE_HEIGHT_MM)
  const [widthMm, setWidthMm] = useState(defaultWidthMm)
  const [obiDimensions, setObiDimensions] = useState<ObiDimensions | undefined>(obi?.obiDimensions)
  const [error, setError] = useState('')
  const obiAlbum = obi ? { ...obi, obiDimensions } : undefined
  const obiLayout = obiAlbum ? getObiLayout(obiAlbum) : undefined
  const activeProfile = resizeWidth ? getSpineCrop(widthMm) : obiAlbum ? getArtworkCrop('obi', obiAlbum) : profile
  const cropSize = resizeWidth && baseSize ? { width: baseSize.width * widthMm / defaultWidthMm, height: baseSize.height } : undefined
  const rotatedMediaSize = mediaSize ? getRotatedSize(mediaSize.width, mediaSize.height, rotation) : null
  const minZoom = resizeWidth && size && rotatedMediaSize
    ? Math.max(1, Math.round(Math.max(size.width / rotatedMediaSize.width, size.height / rotatedMediaSize.height) * 100000) / 100000) : 1
  const maxZoom = Math.max(3, minZoom * 3)
  useEffect(() => { setZoom((value) => Math.min(maxZoom, Math.max(value, minZoom))) }, [minZoom, maxZoom])
  useLayoutEffect(() => {
    if (!anchor.current || !size || !rotatedMediaSize) return
    // react-easy-crop 的 crop.x 是图片中心相对裁剪框中心的偏移。
    const slack = Math.max(0, (rotatedMediaSize.width * zoom - size.width) / 2)
    const side = anchor.current
    setCrop((previous) => {
      const x = side === 'left' ? slack : side === 'right' ? -slack : Math.min(slack, Math.max(-slack, previous.x))
      return Math.abs(previous.x - x) < 0.01 ? previous : { ...previous, x }
    })
  }, [size?.width, zoom, rotatedMediaSize?.width])
  function changeSpineWidth(value: number) {
    const percent = areaPercent.current
    const left = !!percent && percent.x <= 0.05
    const right = !!percent && percent.x + percent.width >= 99.95
    // 两边都贴（图片比框窄）或都不贴时，仍按中心伸缩。
    anchor.current = left === right ? 'center' : left ? 'left' : 'right'
    setWidthMm(clampSpineWidthMm(value))
  }
  useEffect(() => {
    const element = dialog.current!
    element.showModal()
    setOpen(true)
    return () => element.close()
  }, [])
  function apply() {
    if (!image.current || !area.current) return
    try { onComplete({ source: cropArtwork(image.current, area.current, activeProfile, rotation), ...(resizeWidth ? { spineWidthMm: widthMm } : {}), ...(obiAlbum ? { obiDimensions: getObiDimensions({ obiDimensions }) } : {}) }) }
    catch { setError(t('crop.failed')) }
  }
  function rotate(value: number) {
    setRotation(((Math.round(value) + 180) % 360 + 360) % 360 - 180)
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
        {open && <Cropper image={source} crop={crop} zoom={zoom} rotation={rotation} aspect={activeProfile.width / activeProfile.height} cropSize={cropSize} minZoom={minZoom} maxZoom={maxZoom}
          cropShape={profile.round ? 'round' : 'rect'} showGrid={!profile.round} disableAutomaticStylesInjection keyboardStep={10}
          onCropChange={setCrop} onZoomChange={setZoom} onInteractionStart={() => { anchor.current = null }} onRotationChange={rotate} setMediaSize={setMediaSize}
          onCropSizeChange={(next) => { setSize(next); if (resizeWidth && !baseSize) setBaseSize(next) }}
          onCropAreaChange={(percent, pixels) => { areaPercent.current = percent; area.current = pixels; setReady(pixels.width > 0 && pixels.height > 0) }}
          setImageRef={(ref) => { image.current = ref.current }}
          mediaProps={{ alt: t('crop.source'), onError: () => { setReady(false); setError(t('crop.failed')) } }}
          cropperProps={{ 'aria-label': t('crop.position') }} />}
        {/* 实物盘面只在 23–116 mm 之间印刷：中心和外缘一圈保持透明。 */}
        {profile.round && size && <div className="crop-disc-hole" aria-hidden="true" style={{ width: size.width * LABEL_INNER_RATIO, height: size.height * LABEL_INNER_RATIO }} />}
        {profile.round && size && <div className="crop-disc-rim" aria-hidden="true" style={{ width: size.width * LABEL_OUTER_RATIO, height: size.height * LABEL_OUTER_RATIO }} />}
        {obiLayout && size && <div className="crop-obi-folds" aria-hidden="true" style={{ width: size.width, height: size.height }}>
          <span style={{ left: `${obiLayout.backWidth / obiLayout.width * 100}%` }} />
          <span style={{ left: `${(obiLayout.backWidth + obiLayout.depth) / obiLayout.width * 100}%` }} />
          <div className="crop-obi-panel" style={{ left: 0, width: `${obiLayout.backWidth / obiLayout.width * 100}%` }}>{t('obi.back')}</div>
          <div className="crop-obi-panel" style={{ left: `${obiLayout.backWidth / obiLayout.width * 100}%`, width: `${obiLayout.depth / obiLayout.width * 100}%` }}>{t('obi.side')}</div>
          <div className="crop-obi-panel" style={{ left: `${(obiLayout.backWidth + obiLayout.depth) / obiLayout.width * 100}%`, width: `${obiLayout.frontWidth / obiLayout.width * 100}%` }}>{t('obi.front')}</div>
        </div>}
      </div>
      <p className="crop-guidance">{t(resizeWidth ? 'crop.spineGuidance' : obiLayout ? 'obi.cropGuidance' : 'crop.guidance')}</p>
      {resizeWidth && <div className="crop-control"><span>{t('crop.spineWidthLabel')}</span>
        <PreciseRange label={t('crop.spineWidthLabel')} value={widthMm} min={MIN_SPINE_WIDTH_MM} max={MAX_SPINE_WIDTH_MM} step={0.1} decimals={1} unit=" mm"
          onChange={changeSpineWidth} /></div>}
      {obiAlbum && <ObiSizeControls dimensions={obiDimensions} thicknessMm={getCaseThicknessMm(obiAlbum)} disabled={!ready} onChange={setObiDimensions} />}
      <div className="crop-control"><span>{t('crop.zoom')}</span>
        <PreciseRange label={t('crop.zoom')} value={zoom} min={minZoom} max={maxZoom} step={0.01} decimals={2} unit="×" onChange={setZoom} /></div>
      <div className="crop-control crop-rotation"><span>{t('crop.rotation')}</span>
        <PreciseRange label={t('crop.rotation')} value={rotation} min={-180} max={180} step={1} decimals={0} unit="°" onChange={rotate} />
        <button type="button" className="crop-rotate" aria-label={t('crop.rotateLeft')} title={t('crop.rotateLeft')} onClick={() => rotate(rotation - 90)}>↶</button>
        <button type="button" className="crop-rotate" aria-label={t('crop.rotateRight')} title={t('crop.rotateRight')} onClick={() => rotate(rotation + 90)}>↷</button>
      </div>
      {error && <p className="editor-error" role="alert">{error}</p>}
      <div className="crop-actions">
        <button type="button" onClick={() => { anchor.current = null; setWidthMm(defaultWidthMm); setObiDimensions(obi?.obiDimensions); setCrop({ x: 0, y: 0 }); setZoom(1); setRotation(0); setError('') }}>{t('crop.reset')}</button>
        <div><button type="button" onClick={() => onComplete(null)}>{t('crop.cancel')}</button>
          <button type="button" className="crop-apply" disabled={!ready} onClick={apply}>{t('crop.apply')}</button></div>
      </div>
    </dialog>
  )
}
