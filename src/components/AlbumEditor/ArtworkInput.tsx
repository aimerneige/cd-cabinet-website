export function ArtworkInput({ label, src, alt, uploadLabel, resetLabel, custom, disabled, variant = 'square', onUpload, onReset }: {
  label: string
  src: string
  alt: string
  uploadLabel: string
  resetLabel: string
  custom: boolean
  disabled: boolean
  variant?: 'square' | 'disc' | 'spine' | 'obi'
  onUpload: (file: File | undefined) => void
  onReset: () => void
}) {
  const preview = variant === 'spine' ? 'spine-preview' : `cover-preview${variant === 'disc' ? ' disc-artwork-preview' : variant === 'obi' ? ' obi-preview' : ''}`
  return (
    <div className="artwork-input">
      <label className="artwork-upload">
        <span>{label}</span>
        <div className={preview}><img src={src} alt={alt} /></div>
        <input type="file" accept="image/jpeg,image/png,image/webp" aria-label={uploadLabel} disabled={disabled} onChange={(event) => {
          onUpload(event.target.files?.[0])
          event.target.value = ''
        }} />
        <small>{uploadLabel}</small>
      </label>
      {custom && <button type="button" className="remove-spine" disabled={disabled} onClick={onReset}>{resetLabel}</button>}
    </div>
  )
}
