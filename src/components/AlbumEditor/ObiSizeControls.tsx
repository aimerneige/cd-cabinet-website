import type { ObiDimensions } from '../../types/album'
import { getObiDimensions, OBI_DIMENSION_LIMITS, OBI_HEIGHT_MM } from '../../lib/obi'
import { useTranslation } from '../../i18n'

export function ObiSizeControls({ dimensions, thicknessMm, disabled, onChange }: {
  dimensions: ObiDimensions | undefined
  thicknessMm: number
  disabled: boolean
  onChange: (dimensions: ObiDimensions | undefined) => void
}) {
  const { t } = useTranslation()
  const values = getObiDimensions({ obiDimensions: dimensions })
  const slider = (key: keyof typeof OBI_DIMENSION_LIMITS, label: string) => (
    <label>
      <span>{label}<small>{values[key].toFixed(1)} mm</small></span>
      <input type="range" min={OBI_DIMENSION_LIMITS[key].min} max={OBI_DIMENSION_LIMITS[key].max} step="0.1"
        value={Math.round(values[key] * 10) / 10} aria-label={label}
        onChange={(event) => onChange({ ...values, [key]: Number(event.target.value) })} />
    </label>
  )
  return <fieldset className="obi-size-controls" disabled={disabled}>
    <legend>{t('obi.size')}</legend>
    <p>{t('obi.fixedSize', { height: OBI_HEIGHT_MM })}</p>
    {/* 与裁剪框里的折痕顺序一致：背面、侧面、正面。 */}
    {slider('backWidthMm', t('obi.backWidth'))}
    <label>
      <span>{t('obi.sideThickness')}<small>{thicknessMm.toFixed(1)} mm</small></span>
      <input type="range" min={thicknessMm} max={thicknessMm} step="0.1"
        disabled value={thicknessMm} aria-label={t('obi.sideThickness')} />
    </label>
    {slider('frontWidthMm', t('obi.frontWidth'))}
    <button type="button" onClick={() => onChange(undefined)}>{t('obi.resetSize')}</button>
  </fieldset>
}
