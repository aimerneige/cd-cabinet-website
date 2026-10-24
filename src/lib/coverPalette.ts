import type { Album } from '../types/album'
import { t } from '../i18n'

export function getCoverPalette(pixels: Uint8ClampedArray): Pick<Album, 'color' | 'ink'> {
  const buckets = new Map<number, { weight: number; red: number; green: number; blue: number }>()
  for (let index = 0; index < pixels.length; index += 4) {
    const [red, green, blue, alpha] = pixels.subarray(index, index + 4)
    if (alpha < 16) continue
    const key = (red >> 5) * 64 + (green >> 5) * 8 + (blue >> 5)
    const bucket = buckets.get(key) ?? { weight: 0, red: 0, green: 0, blue: 0 }
    const weight = alpha / 255
    bucket.weight += weight
    bucket.red += red * weight
    bucket.green += green * weight
    bucket.blue += blue * weight
    buckets.set(key, bucket)
  }
  const dominant = [...buckets.values()].sort((a, b) => b.weight - a.weight)[0]
  const channels = dominant
    ? [dominant.red, dominant.green, dominant.blue].map((value) => Math.round(value / dominant.weight))
    : [122, 130, 115]
  const color = '#' + channels.map((value) => value.toString(16).padStart(2, '0')).join('')
  const linear = channels.map((value) => {
    const channel = value / 255
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  const luminance = linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722
  const ink = (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05) ? '#000000' : '#ffffff'
  return { color, ink }
}

export async function readCoverPalette(source: string): Promise<Pick<Album, 'color' | 'ink'>> {
  const image = new Image()
  image.src = source
  try { await image.decode() }
  catch { throw new Error(t('artworkErrors.decodeFailed')) }
  // 只在确认封面裁剪后采样一次，避免渲染和输入文字时反复解码大图。
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 64
  const context = canvas.getContext('2d')
  if (!context) throw new Error(t('artworkErrors.readFailed'))
  context.drawImage(image, 0, 0, 64, 64)
  return getCoverPalette(context.getImageData(0, 0, 64, 64).data)
}
