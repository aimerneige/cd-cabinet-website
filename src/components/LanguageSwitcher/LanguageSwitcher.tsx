import { useTranslation, type Locale } from '../../i18n'

const LANGUAGES: { code: Locale; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'zh', label: '中文' },
  { code: 'ja', label: '日本語' },
]

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useTranslation()

  return (
    <div className="language-switcher">
      <select
        className="language-select"
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        aria-label={t('language.selectAria')}
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.label}
          </option>
        ))}
      </select>
    </div>
  )
}
