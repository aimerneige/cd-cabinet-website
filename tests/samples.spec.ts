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
  return { name: 'Sample song.wav', mimeType: 'audio/wav', buffer }
}

async function edit(page: Page, id: string) {
  await page.locator(`[data-album-id="${id}"]`).click()
  await expect(page.locator('.viewer-controls')).toHaveCSS('opacity', '1')
  await page.getByRole('button', { name: 'Edit recording', exact: true }).click()
  await expect(page.locator('.album-editor')).toBeVisible()
}

async function addPersonalRecording(page: Page) {
  await page.getByRole('button', { name: 'Add recording' }).click()
  await page.getByRole('textbox', { name: 'Album title', exact: true }).fill('Personal recording')
  await page.getByRole('textbox', { name: 'Artist', exact: true }).fill('Personal Artist')
  await page.getByLabel('Add audio files', { exact: true }).setInputFiles(audioFile())
  await expect(page.locator('.editor-track-list li')).toHaveCount(1)
  await page.getByRole('button', { name: 'Add recording', exact: true }).click()
  await expect(page.locator('.album-editor')).toHaveCount(0)
  return (await page.getByRole('button', { name: 'Open Personal recording by Personal Artist', exact: true }).getAttribute('data-album-id'))!
}

async function uploadSampleCover(page: Page) {
  const file = { name: 'sample.png', mimeType: 'image/png', buffer: await page.screenshot() }
  await page.getByLabel('Upload cover artwork', { exact: true }).setInputFiles(file)
  await confirmCrop(page)
  return (await page.getByRole('img', { name: 'Cover preview', exact: true }).getAttribute('src'))!
}

async function save(page: Page) {
  await page.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(page.locator('.album-editor')).toHaveCount(0)
}

async function clearSamples(page: Page) {
  await page.getByRole('button', { name: 'Clear sample CDs', exact: true }).click()
  await page.getByRole('alertdialog', { name: 'Clear sample CDs?', exact: true }).getByRole('button', { name: 'Clear sample CDs', exact: true }).click()
  await expect(page.getByRole('alertdialog')).toHaveCount(0)
}

async function snapshot(page: Page) {
  return page.evaluate(() => new Promise<{ artwork: string[]; audio: string[]; ids: string[] }>((resolve, reject) => {
    const request = indexedDB.open('cd-cabinet')
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction(['collection', 'artwork', 'audio'], 'readonly')
      const collection = transaction.objectStore('collection').get('albums')
      const artwork = transaction.objectStore('artwork').getAllKeys()
      const audio = transaction.objectStore('audio').getAllKeys()
      transaction.oncomplete = () => {
        db.close()
        resolve({ artwork: artwork.result.map(String), audio: audio.result.map(String), ids: (collection.result ?? []).map((album: { id: string }) => album.id) })
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

test('sample clearing requires confirmation and clearing and restoring persist without duplicates', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const clear = page.getByRole('button', { name: 'Clear sample CDs', exact: true })
  const restore = page.getByRole('button', { name: 'Restore sample CDs', exact: true })
  await expect(restore).toBeDisabled()
  await clear.click()
  const confirmation = page.getByRole('alertdialog', { name: 'Clear sample CDs?', exact: true })
  await expect(confirmation).toContainText('24')
  await expect(confirmation.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused()
  await page.screenshot({ path: 'test-results/clear-samples-mobile.png' })
  await page.keyboard.press('Escape')
  await expect(confirmation).toHaveCount(0)
  await expect(clear).toBeFocused()
  await expect(page.locator('.shelf-cd')).toHaveCount(24)
  await page.getByRole('button', { name: 'Jazz', exact: true }).click()
  await expect(page.locator('.shelf-cd')).toHaveCount(6)
  await clearSamples(page)
  await expect(page.locator('.shelf-cd')).toHaveCount(0)
  await expect(clear).toBeDisabled()
  await expect(restore).toBeEnabled()
  await page.reload()
  await expect(page.locator('.shelf-cd')).toHaveCount(0)
  await restore.click()
  await expect(page.locator('.shelf-cd')).toHaveCount(24)
  await expect(restore).toBeDisabled()
  await expect(page.locator('.shelf')).toHaveCount(2)
  await page.reload()
  await expect(page.locator('.shelf-cd')).toHaveCount(24)
  expect(new Set((await snapshot(page)).ids).size).toBe(24)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
})

test('clearing samples removes their files while personal random covers and audio survive', async ({ page }) => {
  const personalId = await addPersonalRecording(page)
  await edit(page, 'album-1')
  await uploadSampleCover(page)
  await page.getByLabel('Add audio files', { exact: true }).setInputFiles(audioFile())
  await expect(page.locator('.editor-track-list li')).toHaveCount(7)
  await save(page)
  const before = await snapshot(page)
  expect(before.artwork).toContain('album-1:cover')
  await page.locator(`[data-album-id="${personalId}"]`).click()
  await expect(page.locator('.viewer-controls')).toHaveCSS('opacity', '1')
  await page.getByRole('button', { name: 'Play Sample song', exact: true }).click()
  await expect.poll(() => page.locator('audio').evaluate((audio) => audio.paused)).toBe(false)
  // 不能后台播放：先把 CD 放回盒中再关闭。
  await page.getByRole('button', { name: 'Return CD to case', exact: true }).click()
  await expect(page.locator('.cd-player')).toHaveCount(0)
  await page.getByRole('button', { name: 'Close album', exact: true }).click()
  await clearSamples(page)
  await expect(page.locator('.shelf-cd')).toHaveCount(1)
  const cleared = await snapshot(page)
  expect(cleared.ids).toEqual([personalId])
  expect(cleared.artwork).toEqual(before.artwork.filter((key) => key.startsWith(`${personalId}:`)))
  expect(cleared.audio).toEqual(before.audio.filter((key) => key.startsWith(`${personalId}:`)))
  await page.getByRole('button', { name: 'Restore sample CDs', exact: true }).click()
  await expect(page.locator('.shelf-cd')).toHaveCount(25)
  const restored = await snapshot(page)
  expect(restored.artwork).toEqual(cleared.artwork)
  expect(restored.audio).toEqual(cleared.audio)
  await page.reload()
  await expect(page.locator(`[data-album-id="${personalId}"]`)).toBeVisible()
  await expect(page.locator('.shelf-cd')).toHaveCount(25)
})

test('restoring a missing sample keeps existing edited samples and their uploaded artwork', async ({ page }) => {
  await edit(page, 'album-1')
  const cover = await uploadSampleCover(page)
  await page.getByRole('textbox', { name: 'Album title', exact: true }).fill('Edited sample')
  await save(page)
  await edit(page, 'album-2')
  await page.getByRole('button', { name: 'Delete recording', exact: true }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete permanently', exact: true }).click()
  await expect(page.locator('.shelf-cd')).toHaveCount(23)
  await page.getByRole('button', { name: 'Restore sample CDs', exact: true }).click()
  await expect(page.locator('.shelf-cd')).toHaveCount(24)
  await expect(page.getByRole('button', { name: 'Open Edited sample by The Paper Kites', exact: true })).toBeVisible()
  await page.locator('[data-album-id="album-1"]').click()
  await expect(page.locator('.lid-front img')).toHaveAttribute('src', cover)
  await page.getByRole('button', { name: 'Close album', exact: true }).click()
  await page.reload()
  await expect(page.getByRole('button', { name: 'Open Edited sample by The Paper Kites', exact: true })).toBeVisible()
  expect((await snapshot(page)).artwork).toContain('album-1:cover')
})

test('storage failures roll back sample clearing and restoring without losing personal files', async ({ page }) => {
  await addPersonalRecording(page)
  await edit(page, 'album-1')
  await uploadSampleCover(page)
  await save(page)
  await edit(page, 'album-2')
  await page.getByRole('button', { name: 'Delete recording', exact: true }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete permanently', exact: true }).click()
  await expect(page.locator('.shelf-cd')).toHaveCount(24)
  const before = await snapshot(page)
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function (value, key) {
      if (this.name === 'collection') throw new DOMException('Storage full', 'QuotaExceededError')
      return put.call(this, value, key)
    }
  })
  await page.getByRole('button', { name: 'Clear sample CDs', exact: true }).click()
  const confirmation = page.getByRole('alertdialog', { name: 'Clear sample CDs?', exact: true })
  await confirmation.getByRole('button', { name: 'Clear sample CDs', exact: true }).click()
  await expect(confirmation.getByRole('alert')).toContainText('Your collection and files have been kept')
  expect(await snapshot(page)).toEqual(before)
  await confirmation.getByRole('button', { name: 'Cancel', exact: true }).click()
  await page.getByRole('button', { name: 'Restore sample CDs', exact: true }).click()
  await expect(page.locator('.sample-collection-actions').getByRole('alert')).toContainText('Your collection has not changed')
  expect(await snapshot(page)).toEqual(before)
  await page.reload()
  expect(await snapshot(page)).toEqual(before)
  await page.getByRole('button', { name: 'Restore sample CDs', exact: true }).click()
  await expect(page.locator('.shelf-cd')).toHaveCount(25)
})

