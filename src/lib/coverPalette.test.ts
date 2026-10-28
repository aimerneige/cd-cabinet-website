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
    expect(getCoverPalette(pixels)).toMatchObject({ color: '#7a342a', ink: '#ffffff' })
  })

  it('ignores invisible pixels and weights partially transparent colors by opacity', () => {
    const pixels = new Uint8ClampedArray([
      240, 30, 20, 0,
      240, 30, 20, 32,
      240, 30, 20, 32,
      240, 30, 20, 32,
      20, 40, 160, 255,
    ])
    expect(getCoverPalette(pixels)).toMatchObject({ color: '#1428a0', ink: '#ffffff' })
  })

  it.each([
    [0, '#000000', '#ffffff'],
    [80, '#505050', '#ffffff'],
    [117, '#757575', '#ffffff'],
    [119, '#777777', '#000000'],
    [220, '#dcdcdc', '#000000'],
    [255, '#ffffff', '#000000'],
  ])('keeps grayscale covers neutral and selects readable text for level %i', (level, color, ink) => {
    expect(getCoverPalette(new Uint8ClampedArray([level, level, level, 255]))).toMatchObject({ color, ink })
  })

  it('provides a stable neutral fallback for fully transparent covers', () => {
    const pixels = new Uint8ClampedArray(64 * 64 * 4)
    expect(getCoverPalette(pixels)).toMatchObject({ color: '#7a8273', ink: '#000000' })
  })

  it('picks three clearly different main tones in order of coverage', () => {
    const pixels = new Uint8ClampedArray([
      ...[20, 30, 90, 255], ...[22, 32, 92, 255], ...[21, 31, 91, 255],
      ...[230, 220, 200, 255], ...[232, 222, 202, 255],
      ...[200, 60, 40, 255],
      ...[24, 34, 94, 255],
    ])
    expect(getCoverPalette(pixels).swatches).toEqual(['#151f5b', '#e7ddc9', '#c83c28'])
  })

  it('repeats the last tone when a cover has fewer than three colors', () => {
    expect(getCoverPalette(new Uint8ClampedArray([10, 10, 10, 255])).swatches).toEqual(['#0a0a0a', '#0a0a0a', '#0a0a0a'])
  })
})
