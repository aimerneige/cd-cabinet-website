import { afterEach, describe, expect, it, vi } from 'vitest'
import { generateCover, getBackCoverArtwork, getDiscArtwork, getGeneratedCoverStyle, randomCoverStyle } from './generatedCover'

afterEach(() => vi.restoreAllMocks())

const details = { title: '夜の音 (Live)', artist: '林 & Friends', year: 2026, genre: 'Ambient' }

describe('generated covers', () => {
  it('never repeats the previous design at either end of the random range', () => {
    const random = vi.spyOn(Math, 'random')
    for (let index = 0; index < 5; index++) {
      random.mockReturnValue(index / 5)
      const previous = randomCoverStyle()
      random.mockReturnValue(0)
      expect(randomCoverStyle(previous).id).not.toBe(previous.id)
      random.mockReturnValue(0.999999)
      expect(randomCoverStyle(previous).id).not.toBe(previous.id)
    }
  })

  it('recovers every saved design and keeps its appearance when details change', () => {
    const random = vi.spyOn(Math, 'random')
    const ids = new Set<string>()
    for (let index = 0; index < 5; index++) {
      random.mockReturnValue(index / 5)
      const style = randomCoverStyle()
      const cover = generateCover(details, style)
      const restored = getGeneratedCoverStyle(cover)!
      ids.add(restored.id)
      expect(restored).toEqual(style)
      const updated = generateCover({ ...details, title: '新しい音' }, restored)
      expect(updated).not.toBe(cover)
      expect(getGeneratedCoverStyle(updated)).toEqual(style)
    }
    expect(ids.size).toBe(5)
    expect(getGeneratedCoverStyle('/assets/albums/album-01.svg')).toBeNull()
    expect(getGeneratedCoverStyle('data:image/png;base64,abcd')).toBeNull()
  })

  it('escapes album information as SVG text and produces a CSS-safe URL', () => {
    const cover = generateCover({
      ...details, title: '<script>alert("x")</script>', artist: 'A & B\'s (Live)',
    }, randomCoverStyle())
    const svg = decodeURIComponent(cover.slice(cover.indexOf(',') + 1))
    expect(svg).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;')
    expect(svg).toContain('A &amp; B&apos;s (Live)')
    expect(svg).not.toContain('<script>')
    expect(cover).not.toMatch(/[\s'"()]/)
  })
})

describe('generated packaging', () => {
  const discs = [
    { id: 'disc-1', tracks: [{ id: 'track-1', title: 'Opening & Echo', duration: '3:24' }] },
    { id: 'disc-2', title: 'Live sessions', tracks: [] },
  ]

  it('generates separate matching disc labels and back covers for every saved style', () => {
    const random = vi.spyOn(Math, 'random')
    for (let index = 0; index < 5; index++) {
      random.mockReturnValue(index / 5)
      const style = randomCoverStyle()
      const album = {
        ...details, color: style.color, ink: style.ink,
        coverUrl: generateCover(details, style), discs, tracks: discs[0].tracks,
      }
      const disc = getDiscArtwork(album, discs[1])
      const back = getBackCoverArtwork(album)
      expect(disc).not.toBe(album.coverUrl)
      expect(back).not.toBe(album.coverUrl)
      expect(back).not.toBe(disc)
      expect(decodeURIComponent(disc)).toContain(`data-cd-disc="${style.id}"`)
      expect(decodeURIComponent(disc)).toContain('DISC 2 / 2')
      expect(decodeURIComponent(disc)).toContain('Live sessions')
      expect(decodeURIComponent(disc)).toContain(style.color)
      expect(getDiscArtwork(album, discs[0])).not.toBe(disc)
      expect(getDiscArtwork(album, discs[1])).toBe(disc)
      expect(decodeURIComponent(back)).toContain(`data-cd-back="${style.id}"`)
      expect(decodeURIComponent(back)).toContain('Opening &amp; Echo')
      expect(decodeURIComponent(back)).toContain('3:24')
      expect(decodeURIComponent(back)).toContain('2 CDs')
    }
  })

  it('keeps custom artwork and generates independent labels for uploaded covers', () => {
    const album = {
      ...details, color: '#536f78', ink: '#f3eee0',
      coverUrl: 'data:image/png;base64,cover', tracks: [],
    }
    expect(decodeURIComponent(getDiscArtwork(album, discs[0]))).toContain('data-cd-disc="custom"')
    expect(decodeURIComponent(getDiscArtwork(album, discs[0]))).toContain('DISC 1 / 1')
    expect(getDiscArtwork(album, { ...discs[0], labelUrl: '/disc.png' })).toBe('/disc.png')
    expect(getBackCoverArtwork({ ...album, backCoverUrl: '/back.png' })).toBe('/back.png')
    expect(getBackCoverArtwork(album)).not.toBe(album.coverUrl)
  })

  it('escapes all album, disc and track text and keeps CSS URLs safe', () => {
    const value = '<script>alert("x")</script> & B\'s (Live)'
    const album = {
      ...details, title: value, artist: value, genre: value,
      color: '#536f78', ink: '#f3eee0', coverUrl: '/cover.png',
      tracks: [{ id: 'track-1', title: value, duration: value }],
    }
    for (const url of [getDiscArtwork(album, { ...discs[0], title: value }), getBackCoverArtwork(album)]) {
      const svg = decodeURIComponent(url.slice(url.indexOf(',') + 1))
      expect(svg).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; B&apos;s (Live)')
      expect(svg).not.toContain('<script>')
      expect(url).not.toMatch(/[\s'"()]/)
    }
  })
})
