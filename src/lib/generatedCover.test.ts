import { afterEach, describe, expect, it, vi } from 'vitest'
import { generateCover, getBackCoverArtwork, getDiscArtwork, getGeneratedCoverStyle, getObiArtwork, randomCoverStyle } from './generatedCover'

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

  it('generates matching disc labels, back covers and OBI strips for every saved style', () => {
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
      const obi = getObiArtwork(album)
      expect(obi).not.toBe(album.coverUrl)
      expect(obi).not.toBe(back)
      expect(getObiArtwork(album)).toBe(obi)
      expect(decodeURIComponent(obi)).toContain(`data-cd-obi="${style.id}"`)
      expect(decodeURIComponent(obi)).toContain('夜の音 (Live)')
      expect(decodeURIComponent(obi)).toContain('林 &amp; Friends')
      expect(decodeURIComponent(obi)).toContain(style.color)
      expect(decodeURIComponent(obi)).toContain('2 CDs')
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
    expect(getObiArtwork({ ...album, obiUrl: '/obi.png' })).toBe('/obi.png')
    expect(decodeURIComponent(getObiArtwork(album))).toContain('data-cd-obi="custom"')
  })

  it('escapes all album, disc and track text and keeps CSS URLs safe', () => {
    const value = '<script>alert("x")</script> & B\'s (Live)'
    const album = {
      ...details, title: value, artist: value, genre: value,
      color: '#536f78', ink: '#f3eee0', coverUrl: '/cover.png',
      tracks: [{ id: 'track-1', title: value, duration: value }],
    }
    for (const url of [getDiscArtwork(album, { ...discs[0], title: value }), getBackCoverArtwork(album), getObiArtwork(album)]) {
      const svg = decodeURIComponent(url.slice(url.indexOf(',') + 1))
      expect(svg).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; B&apos;s (Live)')
      expect(svg).not.toContain('<script>')
      expect(url).not.toMatch(/[\s'"()]/)
    }
  })

  it('sizes the unfolded OBI to standard and thicker cases', () => {
    const album = { ...details, color: '#536f78', ink: '#f3eee0', coverUrl: '/cover.png' }
    expect(decodeURIComponent(getObiArtwork(album))).toContain('viewBox="0 0 124 304"')
    for (const count of [0, 1, 3, 4, 6]) {
      const discs = Array.from({ length: count }, (_, index) => ({ id: `disc-${index}`, tracks: [] }))
      const svg = decodeURIComponent(getObiArtwork({ ...album, discs }))
      expect(svg).toContain(`viewBox="0 0 ${count > 3 ? 158 : 124} 304"`)
      expect(svg).toContain('data-obi-panel="back" transform="translate(0 0)"')
      expect(svg).toContain('data-obi-panel="spine" transform="translate(46 0)"')
      expect(svg).toContain(`data-obi-panel="front" transform="translate(${count > 3 ? 112 : 78} 0)"`)
    }
  })
})
