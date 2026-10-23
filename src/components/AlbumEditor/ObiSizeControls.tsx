import type { ObiDimensions } from '../../types/album'
import { getObiDimensions, OBI_DIMENSION_LIMITS } from '../../lib/obi'
import { useTranslation } from '../../i18n'

export function ObiSizeControls({ dimensions, disabled, onChange }: {
  dimensions: ObiDimensions | undefined
  disabled: boolean
  onChange: (dimensions: ObiDimensions | undefined) => void
}) {
  const { t } = useTranslation()
  const values = getObiDimensions({ obiDimensions: dimensions })
  const labels = { frontWidthMm: 'obi.frontWidth', backWidthMm: 'obi.backWidth', heightMm: 'obi.height' } as const
  return <fieldset className="obi-size-controls" disabled={disabled}>
    <legend>{t('obi.size')}</legend>
    {(['frontWidthMm', 'backWidthMm', 'heightMm'] as const).map((key) => <label key={key}>
      <span>{t(labels[key])}<small>{values[key].toFixed(1)} mm</small></span>
      <input type="range" min={OBI_DIMENSION_LIMITS[key].min} max={OBI_DIMENSION_LIMITS[key].max} step="0.1"
        value={Math.round(values[key] * 10) / 10} aria-label={t(labels[key])}
        onChange={(event) => onChange({ ...dimensions, [key]: Number(event.target.value) })} />
    </label>)}
    <button type="button" onClick={() => onChange(undefined)}>{t('obi.resetSize')}</button>
  </fieldset>
}
