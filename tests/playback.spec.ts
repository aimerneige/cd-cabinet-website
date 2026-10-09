import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

function wave(seconds: number) {
  const sampleRate = 8000
  const samples = Math.round(sampleRate * seconds)
  const buffer = Buffer.alloc(44 + samples * 2)
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(buffer.length - 8, 4)
  buffer.write('WAVEfmt ', 8)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(1, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(sampleRate * 2, 28)
  buffer.writeUInt16LE(2, 32)
  buffer.writeUInt16LE(16, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(samples * 2, 40)
  for (let i = 0; i < samples; i++) buffer.writeInt16LE(Math.round(Math.sin(i * 2 * Math.PI * 440 / sampleRate) * 1000), 44 + i * 2)
  return buffer
}

async function draftAudioAlbum(page: Page) {
  await page.goto('/')
  await expect(page.locator('.shelf-cd')).toHaveCount(24)
  const image = await page.screenshot()
  await page.getByRole('button', { name: 'Add recording' }).click()
  await page.getByRole('textbox', { name: 'Album title', exact: true }).fill('Listening Session')
  await page.getByRole('textbox', { name: 'Artist', exact: true }).fill('Local Artist')
  await page.getByLabel('Upload cover artwork').setInputFiles({ name: 'cover.png', mimeType: 'image/png', buffer: image })
  await expect(page.getByRole('img', { name: 'Cover preview' })).toBeVisible()
}

async function seedAudio(page: Page, lengths: number[]) {
  await draftAudioAlbum(page)
  await page.getByLabel('Add audio files').setInputFiles(lengths.map((length, index) => ({
    name: `Song ${index + 1}.wav`, mimeType: 'audio/wav', buffer: wave(length),
  })))
  await expect(page.locator('.editor-track-list li')).toHaveCount(lengths.length)
  await page.getByRole('button', { name: 'Add recording', exact: true }).click()
  await expect(page.locator('.album-editor')).toHaveCount(0)
  await page.reload()
  await page.getByRole('button', { name: 'Open Listening Session by Local Artist', exact: true }).click()
  await expect(page.locator('.viewer-controls')).toHaveCSS('opacity', '1')
}

test('track selection loads the CD player, reports missing audio and returns the disc', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await page.locator('[data-album-id="album-1"]').click()
  await expect(page.locator('.viewer-controls')).toHaveCSS('opacity', '1')
  await page.getByRole('button', { name: 'Play Somewhere Familiar', exact: true }).click()
  await expect(page.getByRole('region', { name: 'CD player', exact: true })).toBeVisible()
  await expect(page.locator('.disc-transfer')).toHaveCount(1)
  await expect(page.locator('.display-heading')).toContainText('03')
  await expect(page.getByRole('alert')).toContainText('This track has no audio')
  await expect(page.locator('.cd-player')).not.toHaveClass(/is-loading/)
  await expect(page.locator('.player-disc')).not.toHaveClass(/is-spinning/)
  await expect(page.getByRole('button', { name: 'Inside', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Next track', exact: true }).click()
  await expect(page.locator('.display-track')).toHaveText('The Space Between')
  await page.getByRole('button', { name: 'Return CD to case', exact: true }).click()
  await expect(page.locator('.cd-player')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Play disc 1 from the beginning' })).toBeVisible()
  await page.getByRole('button', { name: 'Close album' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('multi-disc audio, titles and replacements persist without rewriting unchanged files', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await draftAudioAlbum(page)
  await page.getByLabel('Number of discs').selectOption('2')
  await page.getByLabel('Add audio files').setInputFiles({ name: 'First.wav', mimeType: 'audio/wav', buffer: wave(12) })
  await expect(page.locator('.editor-track-list li')).toHaveCount(1)
  await page.getByRole('button', { name: 'Disc 2', exact: true }).click()
  await page.getByLabel('Add audio files').setInputFiles([
    { name: 'Second.wav', mimeType: 'audio/wav', buffer: wave(13) },
    { name: 'Third.wav', mimeType: 'audio/wav', buffer: wave(14) },
  ])
  await expect(page.locator('.editor-track-list li')).toHaveCount(2)
  await page.getByRole('textbox', { name: 'Track 1 title', exact: true }).fill('Second Song')
  await page.getByRole('button', { name: 'Add recording', exact: true }).click()
  await expect(page.locator('.album-editor')).toHaveCount(0)
  await page.reload()
  await page.getByRole('button', { name: 'Open Listening Session by Local Artist', exact: true }).click()
  await expect(page.locator('.viewer-controls')).toHaveCSS('opacity', '1')
  await page.getByRole('button', { name: 'Disc 2', exact: true }).click()
  await page.getByRole('button', { name: 'Play Second Song', exact: true }).click()
  await expect(page.locator('.display-track')).toHaveText('Second Song')
  await expect.poll(() => page.locator('audio').evaluate((audio) => audio.duration)).toBe(13)
  await expect.poll(() => page.locator('audio').evaluate((audio) => audio.paused)).toBe(false)
  await page.getByRole('button', { name: 'Edit recording', exact: true }).click()
  await expect(page.locator('.album-editor')).toBeVisible()
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put
    sessionStorage.setItem('audioWrites', '0')
    IDBObjectStore.prototype.put = function (value, key) {
      if (this.name === 'audio') sessionStorage.setItem('audioWrites', String(Number(sessionStorage.getItem('audioWrites')) + 1))
      return put.call(this, value, key)
    }
  })
  await page.getByRole('textbox', { name: 'Album title', exact: true }).fill('Updated Listening Session')
  await page.getByLabel('Number of discs').selectOption('1')
  await expect(page.locator('.editor-track-list li')).toHaveCount(3)
  await expect(page.getByRole('textbox', { name: 'Track 2 title', exact: true })).toHaveValue('Second Song')
  await page.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(page.locator('.album-editor')).toHaveCount(0)
  expect(await page.evaluate(() => sessionStorage.getItem('audioWrites'))).toBe('0')
  await page.reload()
  await page.getByRole('button', { name: 'Open Updated Listening Session by Local Artist', exact: true }).click()
  await expect(page.locator('.viewer-controls')).toHaveCSS('opacity', '1')
  await page.getByRole('button', { name: 'Edit recording', exact: true }).click()
  await expect(page.locator('.album-editor')).toBeVisible()
  await page.getByLabel('Upload audio for Second Song').setInputFiles({ name: 'Replacement.wav', mimeType: 'audio/wav', buffer: wave(16) })
  await expect(page.locator('.editor-track-list')).toContainText('Replacement.wav')
  await page.getByRole('button', { name: 'Remove Third', exact: true }).click()
  await page.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(page.locator('.album-editor')).toHaveCount(0)
  await page.reload()
  await page.getByRole('button', { name: 'Open Updated Listening Session by Local Artist', exact: true }).click()
  await expect(page.locator('.viewer-controls')).toHaveCSS('opacity', '1')
  await page.getByRole('button', { name: 'Play Second Song', exact: true }).click()
  await expect.poll(() => page.locator('audio').evaluate((audio) => audio.duration)).toBe(16)
  await expect(page.locator('.track-list li')).toHaveCount(2)
  expect(await page.evaluate(() => new Promise<number>((resolve, reject) => {
    const request = indexedDB.open('cd-cabinet')
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const database = request.result
      const transaction = database.transaction('audio', 'readonly')
      const count = transaction.objectStore('audio').count()
      transaction.oncomplete = () => { database.close(); resolve(count.result) }
      transaction.onerror = () => { database.close(); reject(transaction.error) }
    }
  }))).toBe(2)
})

test('invalid audio batches are rejected together and cancelling does not save files', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await draftAudioAlbum(page)
  await page.getByLabel('Add audio files').setInputFiles([
    { name: 'Valid.wav', mimeType: 'audio/wav', buffer: wave(2) },
    { name: 'Broken.wav', mimeType: 'audio/wav', buffer: Buffer.from('broken audio') },
  ])
  await expect(page.locator('.editor-error')).toContainText('Broken.wav')
  await expect(page.locator('.editor-track-list li')).toHaveCount(0)
  await page.getByLabel('Add audio files').setInputFiles({ name: 'Notes.txt', mimeType: 'text/plain', buffer: Buffer.from('not audio') })
  await expect(page.locator('.editor-error')).toContainText('Choose an MP3')
  await page.getByLabel('Add audio files').setInputFiles({ name: 'Empty.wav', mimeType: 'audio/wav', buffer: Buffer.alloc(0) })
  await expect(page.locator('.editor-error')).toContainText('empty, damaged or unsupported')
  await page.getByLabel('Add audio files').setInputFiles({ name: 'Valid.wav', mimeType: 'audio/wav', buffer: wave(2) })
  await expect(page.locator('.editor-track-list li')).toHaveCount(1)
  await page.locator('.editor-audio').scrollIntoViewIfNeeded()
  await page.screenshot({ path: 'test-results/audio-editor-mobile.png' })
  expect(await page.locator('.album-editor').evaluate((dialog) => dialog.scrollWidth <= dialog.clientWidth)).toBe(true)
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await page.reload()
  await expect(page.locator('.shelf-cd')).toHaveCount(24)
})

test('a failed save rolls back uploaded audio and the collection together', async ({ page }) => {
  await draftAudioAlbum(page)
  await page.getByLabel('Add audio files').setInputFiles({ name: 'Unsaved.wav', mimeType: 'audio/wav', buffer: wave(2) })
  await expect(page.locator('.editor-track-list li')).toHaveCount(1)
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function (value, key) {
      if (this.name === 'collection') throw new DOMException('Storage full', 'QuotaExceededError')
      return put.call(this, value, key)
    }
  })
  await page.getByRole('button', { name: 'Add recording', exact: true }).click()
  await expect(page.locator('.editor-error')).toContainText('could not be saved')
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await page.reload()
  await expect(page.locator('.shelf-cd')).toHaveCount(24)
  expect(await page.evaluate(() => new Promise<number>((resolve, reject) => {
    const request = indexedDB.open('cd-cabinet')
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const database = request.result
      const transaction = database.transaction('audio', 'readonly')
      const count = transaction.objectStore('audio').count()
      transaction.oncomplete = () => { database.close(); resolve(count.result) }
      transaction.onerror = () => { database.close(); reject(transaction.error) }
    }
  }))).toBe(0)
})

test('mobile reduced motion opens the case before loading a track from the back view', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.locator('[data-album-id="album-3"]').click()
  await expect(page.locator('.viewer-controls')).toHaveCSS('opacity', '1')
  await page.getByRole('button', { name: 'Disc 2', exact: true }).click()
  await expect(page.locator('.selected-disc-label')).toHaveText('DISC 2 / 2')
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Back', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Play A Little Further', exact: true }).click()
  await expect(page.locator('.cd-player')).toBeVisible()
  await expect(page.locator('.cd-player')).not.toHaveClass(/is-loading/)
  await expect(page.locator('.display-heading')).toContainText('02')
  const box = (await page.locator('.cd-player').boundingBox())!
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(390)
  const discBox = (await page.locator('.player-disc').boundingBox())!
  const wellBox = (await page.locator('.player-well').boundingBox())!
  expect(discBox.width).toBeLessThan(wellBox.width)
  expect(discBox.x).toBeGreaterThan(wellBox.x)
  expect((await page.locator('.album-details').boundingBox())!.y).toBeGreaterThan(box.y + box.height)
  await page.screenshot({ path: 'test-results/cd-player-mobile.png', fullPage: true })
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('real audio drives playback, rotation, track selection, seeking and transport controls', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await seedAudio(page, [15, 15, 15])
  await page.getByRole('button', { name: 'Play Song 2', exact: true }).click()
  await expect(page.locator('.cd-player')).not.toHaveClass(/is-loading/)
  await expect(page.locator('.display-heading')).toContainText('02')
  await expect.poll(() => page.locator('audio').evaluate((audio) => audio.paused)).toBe(false)
  await expect.poll(() => page.locator('audio').evaluate((audio) => audio.currentTime)).toBeGreaterThan(0)
  await expect(page.locator('.player-disc')).toHaveCSS('animation-play-state', 'running')
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  await expect(page.locator('.player-disc')).not.toHaveClass(/is-spinning/)
  await expect.poll(() => page.locator('audio').evaluate((audio) => audio.paused)).toBe(true)
  await page.getByRole('slider', { name: 'Playback position', exact: true }).focus()
  await page.keyboard.press('Home')
  await page.keyboard.press('ArrowRight')
  await expect.poll(() => page.locator('audio').evaluate((audio) => audio.currentTime)).toBeCloseTo(0.1, 1)
  await page.getByRole('slider', { name: 'Volume', exact: true }).focus()
  await page.keyboard.press('Home')
  await expect.poll(() => page.locator('audio').evaluate((audio) => audio.volume)).toBe(0)
  await page.getByRole('button', { name: 'Stop', exact: true }).click()
  await expect.poll(() => page.locator('audio').evaluate((audio) => audio.currentTime)).toBe(0)
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.locator('.player-disc')).toHaveClass(/is-spinning/)
  await page.getByRole('button', { name: 'Previous track', exact: true }).click()
  await expect(page.locator('.display-track')).toHaveText('Song 1')
  await page.getByRole('button', { name: 'Next track', exact: true }).click()
  await expect(page.locator('.display-track')).toHaveText('Song 2')
  await page.getByRole('button', { name: 'Play Song 3', exact: true }).click()
  await expect(page.locator('.display-track')).toHaveText('Song 3')
  await page.getByRole('button', { name: 'Return CD to case', exact: true }).click()
  await expect(page.locator('.cd-player')).toHaveCount(0)
  await page.getByRole('button', { name: 'Play disc 1 from the beginning', exact: true }).click()
  await expect(page.locator('.display-track')).toHaveText('Song 1')
  await expect(page.locator('.cd-player')).not.toHaveClass(/is-loading/)
  await page.screenshot({ path: 'test-results/cd-player-desktop.png' })
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('audio')).toHaveCount(0)
  await page.getByRole('button', { name: 'Open Listening Session by Local Artist', exact: true }).click()
  await expect(page.locator('.viewer-controls')).toHaveCSS('opacity', '1')
  await page.getByRole('button', { name: 'Play disc 1 from the beginning', exact: true }).click()
  await expect(page.locator('.disc-transfer')).toHaveCount(1)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('audio')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('audio end advances to the next track and stops at the end of the disc', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await seedAudio(page, [0.8, 2])
  await page.getByRole('button', { name: 'Play disc 1 from the beginning', exact: true }).click()
  await expect(page.locator('.display-track')).toHaveText('Song 2')
  await expect(page.getByRole('button', { name: 'Next track', exact: true })).toBeDisabled()
  await expect.poll(() => page.locator('audio').evaluate((audio) => audio.paused)).toBe(true)
  await expect(page.locator('.player-disc')).not.toHaveClass(/is-spinning/)
  await expect.poll(() => page.locator('audio').evaluate((audio) => audio.currentTime)).toBe(0)
  await expect(page.locator('.player-disc')).toHaveCSS('animation-name', 'none')
})
