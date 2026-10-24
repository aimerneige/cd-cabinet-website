import type { ObiDimensions } from '../../types/album'
import { getObiDimensions, OBI_DIMENSION_LIMITS, OBI_FRONT_WIDTH_MM } from '../../lib/obi'
import { useTranslation } from '../../i18n'

export function ObiSizeControls({ dimensions, thicknessMm, disabled, onChange }: {
  dimensions: ObiDimensions | undefined
  thicknessMm: number
  disabled: boolean
  onChange: (dimensions: ObiDimensions | undefined) => void
}) {
  const { t } = useTranslation()
  const values = getObiDimensions({ obiDimensions: dimensions })
  return <fieldset className="obi-size-controls" disabled={disabled}>
    <legend>{t('obi.size')}</legend>
    <p>{t('obi.fixedSize', { width: OBI_FRONT_WIDTH_MM.toFixed(1), height: 125 })}</p>
    <label>
      <span>{t('obi.sideThickness')}<small>{thicknessMm.toFixed(1)} mm</small></span>
      <input type="range" min={thicknessMm} max={thicknessMm} step="0.1"
        disabled value={thicknessMm} aria-label={t('obi.sideThickness')} />
    </label>
    <label>
      <span>{t('obi.backWidth')}<small>{values.backWidthMm.toFixed(1)} mm</small></span>
      <input type="range" min={OBI_DIMENSION_LIMITS.backWidthMm.min} max={OBI_DIMENSION_LIMITS.backWidthMm.max} step="0.1"
        value={Math.round(values.backWidthMm * 10) / 10} aria-label={t('obi.backWidth')}
        onChange={(event) => onChange({ backWidthMm: Number(event.target.value) })} />
    </label>
    <button type="button" onClick={() => onChange(undefined)}>{t('obi.resetSize')}</button>
  </fieldset>
}
