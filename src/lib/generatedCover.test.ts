import { afterEach, describe, expect, it, vi } from 'vitest'
import { artworkPalettes, artworkThemes, generateCover, getBackCoverArtwork, getDiscArtwork, getGeneratedCoverStyle, getInnerArtwork, getObiArtwork, getSpineArtwork, randomCoverStyle } from './generatedCover'
import { getSpineDepth } from './album'
import { getObiLayout } from './obi'

afterEach(() => vi.restoreAllMocks())

const details = { title: '夜の音 (Live)', artist: '林 & Friends', year: 2026, genre: 'Ambient' }

describe('generated covers', () => {
  it('never repeats the previous design at either end of the random range', () => {
    const random = vi.spyOn(Math, 'random')
    for (let index = 0; index < artworkThemes.length; index++) {
      random.mockReturnValue(index / artworkThemes.length)
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
    for (let index = 0; index < artworkThemes.length; index++) {
      random.mockReturnValue(index / artworkThemes.length)
      const style = randomCoverStyle()
      const cover = generateCover(details, style)
      const restored = getGeneratedCoverStyle(cover)!
      ids.add(restored.id)
      expect(restored).toEqual(style)
      const updated = generateCover({ ...details, title: '新しい音' }, restored)
      expect(updated).not.toBe(cover)
      expect(getGeneratedCoverStyle(updated)).toEqual(style)
    }
    expect(ids.size).toBe(artworkThemes.length)
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

  it('recovers independently chosen colors without reverting to the theme default', () => {
    for (const theme of artworkThemes) {
      for (const palette of artworkPalettes) {
        const style = { id: theme, color: palette.color, ink: palette.ink, accent: palette.accent }
        const cover = generateCover(details, style)
        const restored = getGeneratedCoverStyle(cover)!
        expect(restored).toEqual(style)
        expect(generateCover(details, restored)).toBe(cover)
      }
    }
  })
})

describe('generated packaging', () => {
  const discs = [
    { id: 'disc-1', tracks: [{ id: 'track-1', title: 'Opening & Echo', duration: '3:24' }] },
    { id: 'disc-2', title: 'Live sessions', tracks: [] },
  ]

  it('generates matching disc labels, back covers and OBI strips for every saved style', () => {
    const random = vi.spyOn(Math, 'random')
    for (let index = 0; index < artworkThemes.length; index++) {
      random.mockReturnValue(index / artworkThemes.length)
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
      artworkTheme: 'tiles' as const, artworkPalette: 'ocean' as const,
    }
    expect(decodeURIComponent(getDiscArtwork(album, discs[0]))).toContain('data-cd-disc="custom"')
    expect(decodeURIComponent(getDiscArtwork(album, discs[0]))).toContain('DISC 1 / 1')
    expect(getDiscArtwork(album, { ...discs[0], labelUrl: '/disc.png' })).toBe('/disc.png')
    expect(getBackCoverArtwork({ ...album, backCoverUrl: '/back.png' })).toBe('/back.png')
    expect(getBackCoverArtwork(album)).not.toBe(album.coverUrl)
    expect(getObiArtwork({ ...album, obiUrl: '/obi.png' })).toBe('/obi.png')
    expect(decodeURIComponent(getObiArtwork(album))).toContain('data-cd-obi="custom"')
    expect(getInnerArtwork({ ...album, bookletBackUrl: '/booklet.png' }, 'booklet')).toBe('/booklet.png')
    expect(getInnerArtwork({ ...album, backInsideUrl: '/inside.png' }, 'back')).toBe('/inside.png')
    expect(getSpineArtwork({ ...album, spineUrl: '/left.png' }, 'left')).toBe('/left.png')
    expect(getSpineArtwork({ ...album, rightSpineUrl: '/right.png' }, 'right')).toBe('/right.png')
    expect(getInnerArtwork(album, 'booklet')).not.toBe(getInnerArtwork(album, 'back'))
    expect(getInnerArtwork(album, 'booklet')).not.toBe(album.coverUrl)
    expect(decodeURIComponent(getSpineArtwork({ ...album, spineUrl: '/left.png' }, 'right'))).toContain('data-cd-spine="right"')
  })

  it('sometimes pairs a random design with another palette', () => {
    const random = vi.spyOn(Math, 'random')
    random.mockReturnValueOnce(0).mockReturnValueOnce(0.9)
    expect(randomCoverStyle()).toEqual({ id: 'dusk', color: '#536f78', ink: '#f3eee0', accent: '#e4b88c' })
    random.mockReturnValueOnce(0).mockReturnValueOnce(0.1).mockReturnValueOnce(0.99)
    const charcoal = artworkPalettes[artworkPalettes.length - 1]
    expect(randomCoverStyle()).toEqual({ id: 'dusk', color: charcoal.color, ink: charcoal.ink, accent: charcoal.accent })
  })

  it('gives the inside back cover its own tray-inlay layout for every theme', () => {
    const inside = new Set<string>()
    for (const theme of artworkThemes) {
      const album = {
        ...details, color: '#536f78', ink: '#f3eee0', coverUrl: '/uploaded-cover.png', tracks: [],
        artworkTheme: theme,
      }
      const back = getInnerArtwork(album, 'back')
      const svg = decodeURIComponent(back)
      expect(back).not.toBe(getInnerArtwork(album, 'booklet'))
      expect(svg).toContain('data-cd-inside="back"')
      expect(svg).toContain('℗ &amp; © 2026 林 &amp; Friends')
      expect(svg).toContain('林 &amp; Friends · 夜の音 (Live)')
      expect(svg).not.toContain('BOOKLET')
      inside.add(back)
    }
    expect(inside.size).toBe(artworkThemes.length)
  })

  it('supports every palette with every theme independently of an uploaded cover', () => {
    for (const palette of artworkPalettes) {
      const variants = [new Set<string>(), new Set<string>(), new Set<string>(), new Set<string>()]
      for (const theme of artworkThemes) {
        const album = {
          ...details, color: palette.color, ink: palette.ink,
          coverUrl: '/uploaded-cover.png', tracks: [],
          artworkTheme: theme, artworkPalette: palette.id,
        }
        const sources = [getDiscArtwork(album, discs[0]), getBackCoverArtwork(album), getInnerArtwork(album, 'booklet'), getObiArtwork(album)]
        for (const [index, source] of sources.entries()) {
          const svg = decodeURIComponent(source)
          expect(svg).toContain(palette.color)
          expect(svg).toContain(palette.ink)
          expect(svg).toContain(palette.accent)
          variants[index].add(source)
        }
      }
      for (const variantsForPart of variants) expect(variantsForPart.size).toBe(artworkThemes.length)
    }
  })

  it('escapes all album, disc and track text and keeps CSS URLs safe', () => {
    const value = '<script>alert("x")</script> & B\'s (Live)'
    const album = {
      ...details, title: value, artist: value, genre: value,
      color: '#536f78', ink: '#f3eee0', coverUrl: '/cover.png',
      tracks: [{ id: 'track-1', title: value, duration: value }],
    }
    for (const url of [getDiscArtwork(album, { ...discs[0], title: value }), getBackCoverArtwork(album), getObiArtwork(album), getInnerArtwork(album, 'booklet'), getInnerArtwork(album, 'back'), getSpineArtwork(album, 'right')]) {
      const svg = decodeURIComponent(url.slice(url.indexOf(',') + 1))
      expect(svg).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; B&apos;s (Live)')
      expect(svg).not.toContain('<script>')
      expect(url).not.toMatch(/[\s'"()]/)
    }
  })

  it('sizes the unfolded OBI to standard cases for every disc count', () => {
    const album = { ...details, color: '#536f78', ink: '#f3eee0', coverUrl: '/cover.png' }
    for (const count of [0, 1, 3, 4, 6]) {
      const discs = Array.from({ length: count }, (_, index) => ({ id: `disc-${index}`, tracks: [] }))
      const svg = decodeURIComponent(getObiArtwork({ ...album, discs }))
      const layout = getObiLayout({ discs })
      expect(svg).toContain(`viewBox="0 0 ${layout.width} ${layout.height}"`)
      expect(svg).toContain('data-obi-panel="back" transform="translate(0 0) scale(1 ')
      expect(svg).toContain(`data-obi-panel="spine" transform="translate(${layout.backWidth} 0) scale(1 `)
      expect(svg).toContain(`data-obi-panel="front" transform="translate(${layout.backWidth + layout.depth} 0) scale(1 `)
    }
  })

  it('generates landscape back inserts while keeping both booklet covers square', () => {
    const album = { ...details, color: '#536f78', ink: '#f3eee0', coverUrl: '/cover.png', tracks: [] }
    for (const source of [getBackCoverArtwork(album), getInnerArtwork(album, 'back')]) {
      const svg = decodeURIComponent(source)
      expect(svg).toContain('width="1380" height="1180" viewBox="0 0 690 590"')
      expect(svg).toContain('<rect width="690" height="590"')
    }
    expect(decodeURIComponent(getInnerArtwork(album, 'booklet'))).toContain('width="1000" height="1000" viewBox="0 0 600 600"')
    const cover = generateCover(details, randomCoverStyle())
    expect(decodeURIComponent(cover)).toContain('width="1000" height="1000" viewBox="0 0 600 600"')
  })

  it('uses independent paper width and outer case thickness for generated artwork', () => {
    const album = { ...details, color: '#536f78', ink: '#f3eee0', coverUrl: '/cover.png', spineWidthMm: 6.5, caseThicknessMm: 14 }
    const depth = getSpineDepth(album)
    for (const side of ['left', 'right'] as const) {
      expect(decodeURIComponent(getSpineArtwork(album, side))).toContain(`viewBox="0 0 ${depth * 2} 600"`)
    }
    const obi = decodeURIComponent(getObiArtwork(album))
    const layout = getObiLayout(album)
    expect(obi).toContain(`viewBox="0 0 ${layout.width} ${layout.height}"`)
    expect(obi).toContain(`data-obi-panel="front" transform="translate(${layout.backWidth + layout.depth} 0) scale(1 `)
  })
})
