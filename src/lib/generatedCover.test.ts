import { afterEach, describe, expect, it, vi } from 'vitest'
import { generateCover, getGeneratedCoverStyle, randomCoverStyle } from './generatedCover'

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
