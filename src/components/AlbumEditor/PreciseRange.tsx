import { useEffect, useRef, useState } from 'react'
import './PreciseRange.css'
import { useTranslation } from '../../i18n'

// 滑块 + 数字输入 + 单步加减按钮：拖动粗调，输入或点按钮按最小单位精确调节。
export function PreciseRange({ label, value, min, max, step, decimals, unit, disabled, valueText, onChange }: {
  label: string
  value: number
  min: number
  max: number
  step: number
  decimals: number
  unit: string
  disabled?: boolean
  valueText?: string
  onChange: (value: number) => void
}) {
  const { t } = useTranslation()
  const format = (next: number) => next.toFixed(decimals)
  const [draft, setDraft] = useState(format(value))
  const [editing, setEditing] = useState(false)
  const latest = useRef(value)
  latest.current = value
  const editStart = useRef(value)
  const repeat = useRef<{ timeout?: number, interval?: number }>({})
  useEffect(() => { if (!editing) setDraft(format(value)) }, [value, editing, decimals])
  useEffect(() => stopRepeat, [])

  const clamp = (next: number) => Math.min(max, Math.max(min, Number(next.toFixed(decimals))))
  function commit(next: number) {
    const clamped = clamp(next)
    if (clamped !== latest.current) onChange(clamped)
    latest.current = clamped
    return clamped
  }
  function nudge(direction: 1 | -1) {
    // 先吸附到步长网格，再走一步，避免 1.23456 这类最小缩放值卡在网格外。
    const snapped = Math.round(latest.current / step) * step
    const next = Math.abs(snapped - latest.current) > step / 1000 && Math.sign(snapped - latest.current) === direction
      ? snapped : snapped + direction * step
    const before = latest.current
    const result = commit(next)
    // 数字框可能仍处于输入状态，按钮点击后要同步显示新值。
    setDraft(format(result))
    // 到达边界后按钮会被禁用、收不到 pointerup，这里主动停止连发。
    if (result === before) stopRepeat()
  }
  function stopRepeat() {
    window.clearTimeout(repeat.current.timeout)
    window.clearInterval(repeat.current.interval)
    repeat.current = {}
  }
  function startRepeat(direction: 1 | -1) {
    stopRepeat()
    window.addEventListener('pointerup', stopRepeat, { once: true })
    nudge(direction)
    repeat.current.timeout = window.setTimeout(() => {
      repeat.current.interval = window.setInterval(() => nudge(direction), 60)
    }, 400)
  }
  function finishEditing(stillEditing = false) {
    setEditing(stillEditing)
    const parsed = Number(draft.replace(',', '.'))
    setDraft(format(draft.trim() && Number.isFinite(parsed) ? commit(parsed) : value))
  }
  const stepper = (direction: 1 | -1) => (
    <button type="button" className="precise-step" disabled={disabled || (direction < 0 ? value <= min : value >= max)}
      aria-label={t(direction < 0 ? 'precise.decrease' : 'precise.increase', { label, step: `${format(step)}${unit}` })}
      title={t(direction < 0 ? 'precise.decrease' : 'precise.increase', { label, step: `${format(step)}${unit}` })}
      onPointerDown={(event) => { if (event.button === 0) { event.preventDefault(); startRepeat(direction) } }}
      onPointerUp={stopRepeat} onPointerLeave={stopRepeat} onPointerCancel={stopRepeat}
      // 键盘触发（Enter/空格）没有指针事件，单独走一步。
      onClick={(event) => { if (event.detail === 0) nudge(direction) }}>{direction < 0 ? '−' : '+'}</button>
  )
  return (
    <div className="precise-range">
      <input type="range" aria-label={label} aria-valuetext={valueText ?? `${format(value)}${unit}`} min={min} max={max} step={step}
        value={value} disabled={disabled} onChange={(event) => commit(Number(event.target.value))} />
      <div className="precise-stepper">
        {stepper(-1)}
        <input type="number" inputMode="decimal" aria-label={t('precise.value', { label })} min={min} max={max} step={step}
          value={draft} disabled={disabled}
          onFocus={(event) => { editStart.current = value; setEditing(true); event.target.select() }}
          onChange={(event) => {
            setDraft(event.target.value)
            const parsed = Number(event.target.value)
            // 范围内的数值立即生效；越界或未输完的值等到失焦/回车时再收进范围。
            if (event.target.value.trim() && Number.isFinite(parsed) && parsed >= min && parsed <= max) commit(parsed)
          }}
          onBlur={() => finishEditing()}
          onKeyDown={(event) => {
            if (event.key === 'Enter') { event.preventDefault(); finishEditing(true); editStart.current = latest.current }
            // 有未撤销的输入时，Esc 只恢复到开始输入前的值，不关闭整个裁剪窗口。
            if (event.key === 'Escape' && (latest.current !== editStart.current || draft !== format(editStart.current))) {
              event.preventDefault()
              commit(editStart.current)
              setDraft(format(editStart.current))
            }
          }} />
        {unit && <span className="precise-unit" aria-hidden="true">{unit.trim()}</span>}
        {stepper(1)}
      </div>
    </div>
  )
}
