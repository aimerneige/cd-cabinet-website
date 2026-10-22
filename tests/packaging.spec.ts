import { test, expect, type Page } from '@playwright/test'
import { confirmCrop } from './helpers/artwork'

async function image(page: Page, color: string) {
  const source = await page.evaluate((fill) => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 64
    const context = canvas.getContext('2d')!
    context.fillStyle = fill
    context.fillRect(0, 0, 64, 64)
    return canvas.toDataURL('image/png')
  }, color)
  return { source, file: { name: 'scan.png', mimeType: 'image/png', buffer: Buffer.from(source.split(',')[1], 'base64') } }
}

async function upload(page: Page, label: string, color: string) {
  const scan = await image(page, color)
  await page.getByLabel(label, { exact: true }).setInputFiles(scan.file)
  await confirmCrop(page)
  await expect(page.getByRole('button', { name: 'Try another cover', exact: true })).toBeEnabled()
  const preview = page.getByLabel(label, { exact: true }).locator('..').locator('img')
  await expect(preview).toHaveAttribute('src', /^data:image\/png/)
  return (await preview.getAttribute('src'))!
}

async function draft(page: Page, title: string) {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await expect(page.locator('.shelf-cd')).toHaveCount(24)
  await page.getByRole('button', { name: 'Add recording' }).click()
  await page.getByRole('textbox', { name: 'Album title', exact: true }).fill(title)
  await page.getByRole('textbox', { name: 'Artist', exact: true }).fill('Print Artist')
}

test('independent booklet, case and per-disc images survive reload and reset separately', async ({ page }) => {
  await draft(page, 'Printed Session')
  await page.getByLabel('Number of discs').selectOption('2')
  const front = await upload(page, 'Upload cover artwork', '#12569a')
  const reverse = await upload(page, 'Upload booklet back cover', '#aa2244')
  const left = await upload(page, 'Upload spine artwork', '#338855')
  const right = await upload(page, 'Upload right spine artwork', '#eecc66')
  const outer = await upload(page, 'Upload back cover artwork', '#8855bb')
  const inner = await upload(page, 'Upload inside back cover', '#ee9955')
  const first = await upload(page, 'Upload disc artwork', '#66bbaa')
  await page.getByRole('combobox', { name: 'Choose a disc', exact: true }).selectOption('1')
  const second = await upload(page, 'Upload disc artwork', '#bb7733')
  await page.getByRole('combobox', { name: 'Choose a disc', exact: true }).selectOption('0')
  await expect(page.getByRole('img', { name: 'Disc preview', exact: true })).toHaveAttribute('src', first)
  await page.getByRole('button', { name: 'Add recording', exact: true }).click()
  await expect(page.locator('.album-editor')).toHaveCount(0)
  await page.reload()
  await page.getByRole('button', { name: 'Open Printed Session by Print Artist', exact: true }).click()
  await expect(page.locator('.lid-front img')).toHaveAttribute('src', front)
  await expect(page.locator('.lid-inside img')).toHaveAttribute('src', reverse)
  await expect(page.locator('.case-spine img')).toHaveAttribute('src', left)
  await expect(page.locator('.case-spine-right img')).toHaveAttribute('src', right)
  await expect(page.locator('.case-rear img')).toHaveAttribute('src', outer)
  await expect(page.locator('.case-back img')).toHaveAttribute('src', inner)
  await expect(page.locator('.tray-front .disc')).toHaveCSS('background-image', `url("${first}")`)
  await expect(page.locator('.tray-back .disc')).toHaveCSS('background-image', `url("${second}")`)
  await page.getByRole('button', { name: 'Case artwork', exact: true }).click()
  for (const source of [outer, inner, left, right]) {
    await expect(page.locator('.reader-paper img')).toHaveAttribute('src', source)
    await page.getByRole('button', { name: 'Next page', exact: true }).click()
  }
  await page.keyboard.press('Escape')
  await expect(page.locator('.artwork-reader')).toHaveCount(0)
  await expect(page.locator('.active-layer')).toBeVisible()
  await page.getByRole('button', { name: 'Read booklet', exact: true }).click()
  await expect(page.locator('.reader-paper img')).toHaveAttribute('src', front)
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('.reader-paper img')).toHaveAttribute('src', reverse)
  await expect(page.getByRole('button', { name: 'Next page', exact: true })).toBeDisabled()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Edit recording', exact: true }).click()
  await page.getByRole('combobox', { name: 'Choose a disc', exact: true }).selectOption('1')
  await page.getByRole('button', { name: 'Use generated disc', exact: true }).click()
  await page.getByRole('button', { name: 'Use generated right spine', exact: true }).click()
  await expect(page.getByRole('img', { name: 'Right spine preview', exact: true })).toHaveAttribute('src', /^data:image\/svg\+xml/)
  await expect(page.getByRole('img', { name: 'Disc preview', exact: true })).toHaveAttribute('src', /^data:image\/svg\+xml/)
  await page.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(page.locator('.album-editor')).toHaveCount(0)
  await page.reload()
  await page.getByRole('button', { name: 'Open Printed Session by Print Artist', exact: true }).click()
  await expect(page.locator('.tray-front .disc')).toHaveCSS('background-image', `url("${first}")`)
  expect(decodeURIComponent(await page.locator('.tray-back .disc').evaluate((element) => getComputedStyle(element).backgroundImage))).toContain('data-cd-disc=')
  await expect(page.locator('.case-spine img')).toHaveAttribute('src', left)
  await expect(page.locator('.case-spine-right img')).toHaveCount(0)
})

test('mixed booklet pages can be ordered, read on a phone and deleted without leaving image files', async ({ page }) => {
  await draft(page, 'Lyrics Session')
  await page.setViewportSize({ width: 390, height: 844 })
  const scan = await image(page, '#887766')
  const other = await image(page, '#557788')
  await page.getByLabel('Upload booklet pages', { exact: true }).setInputFiles([
    { ...scan.file, name: 'First scan.png' }, { ...other.file, name: 'Second scan.png' },
  ])
  await confirmCrop(page, 2)
  await expect(page.locator('.booklet-pages-editor li')).toHaveCount(2)
  const croppedScan = (await page.locator('.booklet-pages-editor li img').first().getAttribute('src'))!
  await page.getByRole('button', { name: 'Add text page', exact: true }).click()
  await page.getByRole('textbox', { name: 'Page 3 title', exact: true }).fill('Words')
  const lyrics = '<b>First line & 回声</b>\n\n' + '夜の音 — another verse\n'.repeat(100) + 'Last verse'
  await page.getByRole('textbox', { name: 'Page 3 text / lyrics', exact: true }).fill(lyrics)
  await page.getByRole('button', { name: 'Move page 3 up', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Page 2 title', exact: true })).toHaveValue('Words')
  await page.getByRole('button', { name: 'Remove page 3', exact: true }).click()
  await page.getByRole('button', { name: 'Move page 1 down', exact: true }).click()
  await page.getByRole('button', { name: 'Add recording', exact: true }).click()
  await expect(page.locator('.album-editor')).toHaveCount(0)
  await page.reload()
  const album = page.getByRole('button', { name: 'Open Lyrics Session by Print Artist', exact: true })
  const id = (await album.getAttribute('data-album-id'))!
  await album.click()
  await page.getByRole('button', { name: 'Read booklet', exact: true }).click()
  await page.getByRole('button', { name: 'Next page', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Words', exact: true })).toBeVisible()
  await expect(page.locator('.reader-paper p')).toHaveText(lyrics)
  await expect(page.locator('.reader-paper b')).toHaveCount(0)
  const paper = page.locator('.reader-paper')
  expect(await paper.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true)
  await paper.evaluate((element) => { element.scrollTop = element.scrollHeight })
  await page.screenshot({ path: 'test-results/booklet-text-mobile.png' })
  const reader = (await page.locator('.artwork-reader').boundingBox())!
  expect(reader.x).toBeGreaterThanOrEqual(0)
  expect(reader.x + reader.width).toBeLessThanOrEqual(390)
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('.reader-paper img')).toHaveAttribute('src', croppedScan)
  await expect(page.locator('.reader-paper')).toHaveJSProperty('scrollTop', 0)
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('button', { name: 'Next page', exact: true })).toBeDisabled()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Read booklet', exact: true })).toBeFocused()
  await page.getByRole('button', { name: 'Edit recording', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Page 1 text / lyrics', exact: true })).toHaveValue(lyrics)
  await page.getByRole('button', { name: 'Remove page 2', exact: true }).click()
  await page.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(page.locator('.album-editor')).toHaveCount(0)
  expect(await page.evaluate((albumId) => new Promise<number>((resolve, reject) => {
    const request = indexedDB.open('cd-cabinet')
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const database = request.result
      const transaction = database.transaction('artwork', 'readonly')
      const keys = transaction.objectStore('artwork').getAllKeys()
      transaction.oncomplete = () => { database.close(); resolve(keys.result.filter((key) => String(key).startsWith(`${albumId}:page:`)).length) }
      transaction.onerror = () => reject(transaction.error)
    }
  }), id)).toBe(0)
})

test('invalid booklet image batches and failed saves leave no partial pages or disc images', async ({ page }) => {
  await draft(page, 'Unfinished Session')
  const scan = await image(page, '#668866')
  await page.getByLabel('Upload booklet pages', { exact: true }).setInputFiles([
    scan.file, { name: 'invalid.txt', mimeType: 'text/plain', buffer: Buffer.from('invalid') },
  ])
  await expect(page.locator('.editor-error')).toContainText('Choose a JPG, PNG or WebP image.')
  await expect(page.locator('.booklet-pages-editor li')).toHaveCount(0)
  await upload(page, 'Upload disc artwork', '#779999')
  await upload(page, 'Upload booklet back cover', '#997799')
  await page.getByLabel('Upload booklet pages', { exact: true }).setInputFiles(scan.file)
  await confirmCrop(page)
  await expect(page.locator('.booklet-pages-editor li')).toHaveCount(1)
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
      const transaction = database.transaction('artwork', 'readonly')
      const count = transaction.objectStore('artwork').count()
      transaction.oncomplete = () => { database.close(); resolve(count.result) }
      transaction.onerror = () => reject(transaction.error)
    }
  }))).toBe(0)
})
