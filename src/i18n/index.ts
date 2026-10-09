import { create } from 'zustand'
import { en } from './locales/en'
import { zh } from './locales/zh'
import { ja } from './locales/ja'
import type { Locale, TranslationParams } from './types'

export type { Locale, TranslationParams }
export type TranslationKey = keyof typeof en

const dictionaries: Record<Locale, Record<TranslationKey, string>> = {
  en,
  zh,
  ja,
}

const STORAGE_KEY = 'cd-cabinet-locale'

function getInitialLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'en' || saved === 'zh' || saved === 'ja') {
      return saved
    }
  } catch {
    // 忽略在无存储权限环境下的错误
  }
  return 'en'
}

function updateHtmlLang(locale: Locale) {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale
  }
}

interface I18nStore {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: TranslationKey, params?: TranslationParams) => string
}

export const useI18nStore = create<I18nStore>((set, get) => ({
  locale: getInitialLocale(),
  setLocale: (locale: Locale) => {
    try {
      localStorage.setItem(STORAGE_KEY, locale)
    } catch {
      // 忽略存储失败
    }
    updateHtmlLang(locale)
    set({ locale })
  },
  t: (key: TranslationKey, params?: TranslationParams) => {
    const { locale } = get()
    const dict = dictionaries[locale] ?? dictionaries.en
    const template = dict[key] ?? dictionaries.en[key] ?? key
    if (!params) return template
    return template.replace(/\{(\w+)\}/g, (match, paramKey) => {
      return paramKey in params ? String(params[paramKey]) : match
    })
  },
}))

// 初始化 HTML 语言属性
updateHtmlLang(useI18nStore.getState().locale)

export function t(key: TranslationKey, params?: TranslationParams): string {
  return useI18nStore.getState().t(key, params)
}

export function useTranslation() {
  const locale = useI18nStore((state) => state.locale)
  const setLocale = useI18nStore((state) => state.setLocale)
  const tFn = useI18nStore((state) => state.t)
  return { locale, setLocale, t: tFn }
}
