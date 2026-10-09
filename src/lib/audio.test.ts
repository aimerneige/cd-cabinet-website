import { expect, it } from 'vitest'
import { readAudio } from './audio'

it('rejects oversized audio before creating a browser media resource', async () => {
  const file = new File(['audio'], 'large.wav', { type: 'audio/wav' })
  Object.defineProperty(file, 'size', { value: 100 * 1024 * 1024 + 1 })
  await expect(readAudio(file)).rejects.toThrow('no larger than 100 MB')
})
