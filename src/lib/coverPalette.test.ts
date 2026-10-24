import { describe, expect, it } from 'vitest'
import { getCoverPalette } from './coverPalette'

describe('cover palettes', () => {
  it('uses the dominant color family instead of averaging unrelated colors', () => {
    const pixels = new Uint8ClampedArray([
      120, 50, 40, 255,
      124, 54, 44, 255,
      122, 52, 42, 255,
      10, 200, 240, 255,
      255, 255, 255, 255,
    ])
    expect(getCoverPalette(pixels)).toEqual({ color: '#7a342a', ink: '#ffffff' })
  })

  it('ignores invisible pixels and weights partially transparent colors by opacity', () => {
    const pixels = new Uint8ClampedArray([
      240, 30, 20, 0,
      240, 30, 20, 32,
      240, 30, 20, 32,
      240, 30, 20, 32,
      20, 40, 160, 255,
    ])
    expect(getCoverPalette(pixels)).toEqual({ color: '#1428a0', ink: '#ffffff' })
  })

  it.each([
    [0, '#000000', '#ffffff'],
    [80, '#505050', '#ffffff'],
    [117, '#757575', '#ffffff'],
    [119, '#777777', '#000000'],
    [220, '#dcdcdc', '#000000'],
    [255, '#ffffff', '#000000'],
  ])('keeps grayscale covers neutral and selects readable text for level %i', (level, color, ink) => {
    expect(getCoverPalette(new Uint8ClampedArray([level, level, level, 255]))).toEqual({ color, ink })
  })

  it('provides a stable neutral fallback for fully transparent covers', () => {
    const pixels = new Uint8ClampedArray(64 * 64 * 4)
    expect(getCoverPalette(pixels)).toEqual({ color: '#7a8273', ink: '#000000' })
  })
})
