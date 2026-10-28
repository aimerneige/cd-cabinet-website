import type { ObiDimensions } from '../../types/album'
import { getObiDimensions, OBI_DIMENSION_LIMITS, OBI_HEIGHT_MM } from '../../lib/obi'
import { useTranslation } from '../../i18n'
import { PreciseRange } from './PreciseRange'

export function ObiSizeControls({ dimensions, thicknessMm, disabled, onChange }: {
  dimensions: ObiDimensions | undefined
  thicknessMm: number
  disabled: boolean
  onChange: (dimensions: ObiDimensions | undefined) => void
}) {
  const { t } = useTranslation()
  const values = getObiDimensions({ obiDimensions: dimensions })
  const slider = (key: keyof typeof OBI_DIMENSION_LIMITS, label: string) => (
    <div className="obi-size-field">
      <span>{label}</span>
      <PreciseRange label={label} value={Math.round(values[key] * 10) / 10} min={OBI_DIMENSION_LIMITS[key].min} max={OBI_DIMENSION_LIMITS[key].max}
        step={0.1} decimals={1} unit=" mm" disabled={disabled} onChange={(value) => onChange({ ...values, [key]: value })} />
    </div>
  )
  return <fieldset className="obi-size-controls" disabled={disabled}>
    <legend>{t('obi.size')}</legend>
    <p>{t('obi.fixedSize', { height: OBI_HEIGHT_MM })}</p>
    {/* 与裁剪框里的折痕顺序一致：背面、侧面、正面。 */}
    {slider('backWidthMm', t('obi.backWidth'))}
    <div className="obi-size-field">
      <span>{t('obi.sideThickness')}</span>
      <small className="obi-size-fixed">{thicknessMm.toFixed(1)} mm</small>
      <input type="range" min={thicknessMm} max={thicknessMm} step="0.1"
        disabled value={thicknessMm} aria-label={t('obi.sideThickness')} />
    </div>
    {slider('frontWidthMm', t('obi.frontWidth'))}
    <button type="button" className="obi-size-reset" onClick={() => onChange(undefined)}>{t('obi.resetSize')}</button>
  </fieldset>
}
