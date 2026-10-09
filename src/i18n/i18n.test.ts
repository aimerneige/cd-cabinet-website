import { beforeEach, describe, expect, it } from 'vitest'
import { t, useI18nStore } from './index'
import { en } from './locales/en'
import { zh } from './locales/zh'
import { ja } from './locales/ja'
import type { TranslationKey } from './index'

describe('i18n dictionaries', () => {
  const enKeys = Object.keys(en).sort()
  const zhKeys = Object.keys(zh).sort()
  const jaKeys = Object.keys(ja).sort()

  it('has identical keys across English, Chinese and Japanese', () => {
    expect(zhKeys).toEqual(enKeys)
    expect(jaKeys).toEqual(enKeys)
  })

  it('has no empty translations in any language', () => {
    for (const key of enKeys as TranslationKey[]) {
      expect(en[key]).toBeTruthy()
      expect(zh[key]).toBeTruthy()
      expect(ja[key]).toBeTruthy()
    }
  })
})

describe('i18n store and translation function', () => {
  beforeEach(() => {
    useI18nStore.getState().setLocale('en')
  })

  it('translates English by default', () => {
    expect(t('header.note')).toBe('A HOME FOR YOUR MUSIC')
    expect(t('toolbar.editShelf')).toBe('Edit shelf')
  })

  it('translates Chinese when locale is set to zh', () => {
    useI18nStore.getState().setLocale('zh')
    expect(t('header.note')).toBe('给音乐一个安放之处')
    expect(t('toolbar.editShelf')).toBe('整理唱片架')
    if (typeof document !== 'undefined') {
      expect(document.documentElement.lang).toBe('zh')
    }
  })

  it('translates Japanese when locale is set to ja', () => {
    useI18nStore.getState().setLocale('ja')
    expect(t('header.note')).toBe('音楽のための居場所')
    expect(t('toolbar.editShelf')).toBe('棚を整理')
    if (typeof document !== 'undefined') {
      expect(document.documentElement.lang).toBe('ja')
    }
  })

  it('translates header.est with the compile-time year', () => {
    const currentYear = new Date().getFullYear().toString()
    expect(t('header.est')).toBe(`EST. ${currentYear}`)
    useI18nStore.getState().setLocale('zh')
    expect(t('header.est')).toBe(`始于 ${currentYear}`)
    useI18nStore.getState().setLocale('ja')
    expect(t('header.est')).toBe(`EST. ${currentYear}`)
  })


  it('interpolates parameters correctly in all languages', () => {
    useI18nStore.getState().setLocale('en')
    expect(
      t('shelf.openAria', { title: 'Blue Hours', artist: 'The Paper Kites' }),
    ).toBe('Open Blue Hours by The Paper Kites')

    useI18nStore.getState().setLocale('zh')
    expect(
      t('shelf.openAria', { title: 'Blue Hours', artist: 'The Paper Kites' }),
    ).toBe('打开 The Paper Kites 的《Blue Hours》')

    useI18nStore.getState().setLocale('ja')
    expect(
      t('shelf.openAria', { title: 'Blue Hours', artist: 'The Paper Kites' }),
    ).toBe('The Paper Kites「Blue Hours」を開く')
  })

  it('interpolates numbers correctly', () => {
    useI18nStore.getState().setLocale('en')
    expect(t('viewer.discButton', { number: 2 })).toBe('Disc 2')

    useI18nStore.getState().setLocale('zh')
    expect(t('viewer.discButton', { number: 2 })).toBe('光盘 2')

    useI18nStore.getState().setLocale('ja')
    expect(t('viewer.discButton', { number: 2 })).toBe('ディスク 2')
  })
})
