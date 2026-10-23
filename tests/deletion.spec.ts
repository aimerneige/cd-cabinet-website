import { test, expect, type Page } from '@playwright/test'
import { confirmCrop } from './helpers/artwork'

function audioFile() {
  const buffer = Buffer.alloc(44 + 8000 * 30 * 2)
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(buffer.length - 8, 4)
  buffer.write('WAVEfmt ', 8)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(1, 22)
  buffer.writeUInt32LE(8000, 24)
  buffer.writeUInt32LE(16000, 28)
  buffer.writeUInt16LE(2, 32)
  buffer.writeUInt16LE(16, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(buffer.length - 44, 40)
  return { name: 'Saved song.wav', mimeType: 'audio/wav', buffer }
}

async function addRecording(page: Page, title: string) {
  await page.getByRole('button', { name: 'Add recording' }).click()
  await expect(page.getByRole('button', { name: 'Delete recording', exact: true })).toHaveCount(0)
  await page.getByRole('textbox', { name: 'Album title', exact: true }).fill(title)
  await page.getByRole('textbox', { name: 'Artist', exact: true }).fill('Removal Artist')
  await page.getByLabel('Add audio files', { exact: true }).setInputFiles(audioFile())
  await expect(page.locator('.editor-track-list li')).toHaveCount(1)
}

async function saveRecording(page: Page, title: string) {
  await page.getByRole('button', { name: 'Add recording', exact: true }).click()
  await expect(page.locator('.album-editor')).toHaveCount(0)
  return (await page.getByRole('button', { name: `Open ${title} by Removal Artist`, exact: true }).getAttribute('data-album-id'))!
}

async function editRecording(page: Page, id: string) {
  await page.locator(`[data-album-id="${id}"]`).click()
  await expect(page.locator('.viewer-controls')).toHaveCSS('opacity', '1')
  await page.getByRole('button', { name: 'Edit recording', exact: true }).click()
  await expect(page.locator('.album-editor')).toBeVisible()
}

async function storedFiles(page: Page) {
  return page.evaluate(() => new Promise<{ artwork: string[]; audio: string[]; ids: string[] }>((resolve, reject) => {
    const request = indexedDB.open('cd-cabinet')
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction(['collection', 'artwork', 'audio'], 'readonly')
      const metadata = transaction.objectStore('collection').get('albums')
      const artwork = transaction.objectStore('artwork').getAllKeys()
      const audio = transaction.objectStore('audio').getAllKeys()
      transaction.oncomplete = () => {
        db.close()
        resolve({ artwork: artwork.result.map(String), audio: audio.result.map(String), ids: (metadata.result ?? []).map((album: { id: string }) => album.id) })
      }
      transaction.onerror = () => { db.close(); reject(transaction.error) }
    }
  }))
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await expect(page.locator('.shelf-cd')).toHaveCount(24)
})

test('deletion requires a native confirmation, preserves cancelled drafts and restores focus after deletion', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await editRecording(page, 'album-1')
  await page.getByRole('textbox', { name: 'Album title', exact: true }).fill('Unsaved title')
  const remove = page.getByRole('button', { name: 'Delete recording', exact: true })
  const confirmation = page.getByRole('alertdialog', { name: 'Delete recording?', exact: true })
  await remove.click()
  await expect(confirmation).toContainText('Blue Hours')
  await expect(confirmation).toContainText('The Paper Kites')
  expect(await confirmation.evaluate((dialog) => dialog.matches(':modal'))).toBe(true)
  await expect(confirmation.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused()
  const bounds = (await confirmation.boundingBox())!
  expect(bounds.x).toBeGreaterThanOrEqual(0)
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(390)
  await page.screenshot({ path: 'test-results/delete-confirmation-mobile.png' })
  await page.keyboard.press('Escape')
  await expect(confirmation).toHaveCount(0)
  await expect(remove).toBeFocused()
  await expect(page.getByRole('textbox', { name: 'Album title', exact: true })).toHaveValue('Unsaved title')
  await expect(page.locator('.shelf-cd')).toHaveCount(24)
  await remove.click()
  await page.keyboard.press('Enter')
  await expect(confirmation).toHaveCount(0)
  await expect(page.locator('.album-editor')).toBeVisible()
  await remove.click()
  await confirmation.getByRole('button', { name: 'Delete permanently', exact: true }).click()
  await expect(page.locator('.album-editor')).toHaveCount(0)
  await expect(page.locator('.shelf-cd')).toHaveCount(23)
  await expect(page.locator('[data-album-id="album-1"]')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Add recording' })).toBeFocused()
  await expect(page.locator('[data-album-id="album-2"] .spine-cap')).toHaveText('01')
  await page.reload()
  await expect(page.locator('.shelf-cd')).toHaveCount(23)
  await expect(page.locator('[data-album-id="album-1"]')).toHaveCount(0)
})

test('confirmed deletion removes every saved image and audio file and unloads its playing disc', async ({ page }) => {
  await addRecording(page, 'Keep Files')
  const keeper = await saveRecording(page, 'Keep Files')
  await addRecording(page, 'Remove Files')
  const file = { name: 'scan.png', mimeType: 'image/png', buffer: await page.screenshot() }
  await page.getByRole('checkbox', { name: 'Include OBI', exact: true }).check()
  for (const label of ['Upload OBI paper strip', 'Upload disc artwork', 'Upload booklet pages']) {
    await page.getByLabel(label, { exact: true }).setInputFiles(file)
    await confirmCrop(page)
  }
  const id = await saveRecording(page, 'Remove Files')
  const before = await storedFiles(page)
  expect(before.artwork.filter((key) => key.startsWith(`${id}:`))).toHaveLength(4)
  expect(before.audio.filter((key) => key.startsWith(`${id}:`))).toHaveLength(1)
  await page.locator(`[data-album-id="${id}"]`).click()
  await expect(page.locator('.viewer-controls')).toHaveCSS('opacity', '1')
  await page.getByRole('button', { name: 'Play Saved song', exact: true }).click()
  await expect.poll(() => page.locator('audio').evaluate((audio) => audio.paused)).toBe(false)
  await page.getByRole('button', { name: 'Edit recording', exact: true }).click()
  await page.getByRole('button', { name: 'Delete recording', exact: true }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete permanently', exact: true }).click()
  await expect(page.locator('.album-editor')).toHaveCount(0)
  await expect(page.locator('.shelf-cd')).toHaveCount(25)
  await expect(page.locator('.compact-player')).toHaveCount(0)
  expect(await page.locator('audio').evaluate((audio) => audio.paused && !audio.hasAttribute('src'))).toBe(true)
  const after = await storedFiles(page)
  expect(after.ids).not.toContain(id)
  expect(after.ids).toContain(keeper)
  expect(after.artwork).toEqual(before.artwork.filter((key) => !key.startsWith(`${id}:`)))
  expect(after.audio).toEqual(before.audio.filter((key) => !key.startsWith(`${id}:`)))
  await page.reload()
  await expect(page.locator('.shelf-cd')).toHaveCount(25)
  await expect(page.locator(`[data-album-id="${id}"]`)).toHaveCount(0)
  await expect(page.locator(`[data-album-id="${keeper}"]`)).toBeVisible()
})

test('failed deletion rolls back all files, keeps the confirmation open and can be retried after reload', async ({ page }) => {
  await addRecording(page, 'Failed Delete')
  const id = await saveRecording(page, 'Failed Delete')
  const before = await storedFiles(page)
  await editRecording(page, id)
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function (value, key) {
      if (this.name === 'collection') throw new DOMException('Storage unavailable', 'QuotaExceededError')
      return put.call(this, value, key)
    }
  })
  await page.getByRole('button', { name: 'Delete recording', exact: true }).click()
  const confirmation = page.getByRole('alertdialog', { name: 'Delete recording?', exact: true })
  await confirmation.getByRole('button', { name: 'Delete permanently', exact: true }).click()
  await expect(confirmation.getByRole('alert')).toContainText('Your recording and files have been kept')
  await expect(confirmation.getByRole('button', { name: 'Delete permanently', exact: true })).toBeEnabled()
  expect(await storedFiles(page)).toEqual(before)
  await confirmation.getByRole('button', { name: 'Cancel', exact: true }).click()
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(page.locator(`[data-album-id="${id}"]`)).toBeVisible()
  await page.reload()
  await expect(page.locator(`[data-album-id="${id}"]`)).toBeVisible()
  expect(await storedFiles(page)).toEqual(before)
  await editRecording(page, id)
  await page.getByRole('button', { name: 'Delete recording', exact: true }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete permanently', exact: true }).click()
  await expect(page.locator('.album-editor')).toHaveCount(0)
  await expect(page.locator('.shelf-cd')).toHaveCount(24)
})

test('deleting a different recording leaves the playing album loaded', async ({ page }) => {
  await addRecording(page, 'Still Playing')
  const keeper = await saveRecording(page, 'Still Playing')
  await page.locator(`[data-album-id="${keeper}"]`).click()
  await expect(page.locator('.viewer-controls')).toHaveCSS('opacity', '1')
  await page.getByRole('button', { name: 'Play Saved song', exact: true }).click()
  await expect.poll(() => page.locator('audio').evaluate((audio) => audio.paused)).toBe(false)
  const source = await page.locator('audio').getAttribute('src')
  await page.getByRole('button', { name: 'Close album', exact: true }).click()
  await editRecording(page, 'album-1')
  await page.getByRole('button', { name: 'Delete recording', exact: true }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete permanently', exact: true }).click()
  await expect(page.locator('.album-editor')).toHaveCount(0)
  await expect(page.locator('.compact-player')).toBeVisible()
  await expect(page.locator('audio')).toHaveAttribute('src', source!)
  expect(await page.locator('audio').evaluate((audio) => audio.paused)).toBe(false)
})
