import { test, expect, type Page } from '@playwright/test'
import { confirmCrop } from './helpers/artwork'

async function visibleObiColors(page: Page) {
  const screenshot = await page.screenshot({ animations: 'allow' })
  return page.evaluate(async (png) => {
    const image = new Image()
    image.src = `data:image/png;base64,${png}`
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const context = canvas.getContext('2d')!
    context.drawImage(image, 0, 0)
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
    const colors = { back: 0, spine: 0, front: 0 }
    for (let i = 0; i < pixels.length; i += 4) {
      const [r, g, b] = [pixels[i], pixels[i + 1], pixels[i + 2]]
      if (r > 220 && g < 40 && b > 220) colors.back += 1
      if (r < 40 && g > 220 && b > 220) colors.spine += 1
      if (r > 220 && g > 220 && b < 40) colors.front += 1
    }
    return colors
  }, screenshot.toString('base64'))
}

test('recordings without OBI omit its artwork and controls and still open and close normally', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => { if (message.text().includes('GSAP target')) errors.push(message.text()) })
  await page.goto('/')
  await page.getByRole('button', { name: 'Add recording' }).click()
  await expect(page.getByRole('checkbox', { name: 'Include OBI', exact: true })).not.toBeChecked()
  await expect(page.getByLabel('Upload OBI paper strip', { exact: true })).toHaveCount(0)
  await page.getByRole('textbox', { name: 'Album title', exact: true }).fill('Without OBI')
  await page.getByRole('textbox', { name: 'Artist', exact: true }).fill('Print Artist')
  await page.getByRole('button', { name: 'Add recording', exact: true }).click()
  await expect(page.locator('.album-editor')).toHaveCount(0)
  await page.reload()
  const album = page.getByRole('button', { name: 'Open Without OBI by Print Artist', exact: true })
  await album.click()
  await expect(page.locator('.viewer-controls')).toHaveCSS('opacity', '1')
  await expect(page.locator('.obi-strip')).toHaveCount(0)
  await expect(page.locator('.obi-controls')).toHaveCount(0)
  await page.getByRole('button', { name: 'Case artwork', exact: true }).click()
  for (let index = 0; index < 3; index += 1) await page.getByRole('button', { name: 'Next page', exact: true }).click()
  await expect(page.locator('.artwork-reader nav small')).toHaveText('4 / 4')
  await expect(page.getByRole('button', { name: 'Next page', exact: true })).toBeDisabled()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Back', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Close album', exact: true }).click()
  await expect(page.locator('.active-layer')).toHaveCount(0)
  await expect(album).toBeFocused()
  expect(errors).toEqual([])
})

test('OBI can be enabled and removed, with its uploaded file deleted after saving', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.getByRole('button', { name: 'Add recording' }).click()
  await page.getByRole('textbox', { name: 'Album title', exact: true }).fill('Optional OBI')
  await page.getByRole('textbox', { name: 'Artist', exact: true }).fill('Print Artist')
  await page.getByRole('checkbox', { name: 'Include OBI', exact: true }).check()
  const image = await page.screenshot()
  await page.getByLabel('Upload OBI paper strip', { exact: true }).setInputFiles({ name: 'obi.png', mimeType: 'image/png', buffer: image })
  await confirmCrop(page)
  await page.getByRole('button', { name: 'Add recording', exact: true }).click()
  await expect(page.locator('.album-editor')).toHaveCount(0)
  await page.reload()
  const album = page.getByRole('button', { name: 'Open Optional OBI by Print Artist', exact: true })
  const id = (await album.getAttribute('data-album-id'))!
  await album.click()
  await expect(page.locator('.obi-controls')).toBeVisible()
  await expect(page.locator('.obi-strip')).toHaveCount(1)
  await page.getByRole('button', { name: 'Edit recording', exact: true }).click()
  await expect(page.getByRole('checkbox', { name: 'Include OBI', exact: true })).toBeChecked()
  await page.getByRole('checkbox', { name: 'Include OBI', exact: true }).uncheck()
  await expect(page.getByRole('img', { name: 'OBI preview', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(page.locator('.album-editor')).toHaveCount(0)
  await page.reload()
  await album.click()
  await expect(page.locator('.obi-controls')).toHaveCount(0)
  await expect(page.locator('.obi-strip')).toHaveCount(0)
  expect(await page.evaluate((key) => new Promise<boolean>((resolve, reject) => {
    const request = indexedDB.open('cd-cabinet')
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction('artwork', 'readonly')
      const file = transaction.objectStore('artwork').get(key)
      transaction.oncomplete = () => { db.close(); resolve(Boolean(file.result)) }
      transaction.onerror = () => reject(transaction.error)
    }
  }), `${id}:obi`)).toBe(false)
})

test('uploaded artwork is painted on every fold through front, back and flat animations', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add recording' }).click()
  await page.getByRole('textbox', { name: 'Album title', exact: true }).fill('Painted OBI')
  await page.getByRole('textbox', { name: 'Artist', exact: true }).fill('Print Artist')
  await page.getByRole('checkbox', { name: 'Include OBI', exact: true }).check()
  const source = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1240
    canvas.height = 3040
    const context = canvas.getContext('2d')!
    for (const [x, width, color] of [[0, 460, '#ff00ff'], [460, 320, '#00ffff'], [780, 460, '#ffff00']] as const) {
      context.fillStyle = color
      context.fillRect(x, 0, width, 3040)
    }
    return canvas.toDataURL('image/png')
  })
  await page.getByLabel('Upload OBI paper strip', { exact: true }).setInputFiles({ name: 'folds.png', mimeType: 'image/png', buffer: Buffer.from(source.split(',')[1], 'base64') })
  await confirmCrop(page)
  await page.getByRole('button', { name: 'Add recording', exact: true }).click()
  await expect(page.locator('.album-editor')).toHaveCount(0)
  await page.reload()
  await page.getByRole('button', { name: 'Open Painted OBI by Print Artist', exact: true }).click()
  await expect(page.locator('.obi-uploaded img')).toHaveCount(3)
  for (const image of await page.locator('.obi-uploaded img').all()) {
    await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true)
  }
  await page.getByRole('button', { name: 'Front', exact: true }).click()
  await page.getByRole('button', { name: 'Attached', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Attached', exact: true })).toHaveAttribute('aria-pressed', 'true')
  expect((await visibleObiColors(page)).front).toBeGreaterThan(100)
  await page.getByRole('button', { name: 'Lay flat', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Lay flat', exact: true })).toHaveAttribute('aria-pressed', 'true')
  for (const count of Object.values(await visibleObiColors(page))) expect(count).toBeGreaterThan(100)
  await page.screenshot({ path: 'test-results/uploaded-obi-flat.png' })
  await page.getByRole('button', { name: 'Hidden', exact: true }).click()
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await page.getByRole('button', { name: 'Attached', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Attached', exact: true })).toHaveAttribute('aria-pressed', 'true')
  expect((await visibleObiColors(page)).back).toBeGreaterThan(100)
  await page.getByRole('button', { name: 'Lay flat', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Lay flat', exact: true })).toHaveAttribute('aria-pressed', 'true')
  for (const count of Object.values(await visibleObiColors(page))) expect(count).toBeGreaterThan(100)
})

test('custom OBI dimensions drive generated artwork, crop guides, uploaded images and persisted folds', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Add recording' }).click()
  await page.getByRole('textbox', { name: 'Album title', exact: true }).fill('Sized OBI')
  await page.getByRole('textbox', { name: 'Artist', exact: true }).fill('Print Artist')
  await page.getByRole('checkbox', { name: 'Include OBI', exact: true }).check()
  await expect(page.locator('.obi-size-controls')).toHaveCount(0)
  const preview = page.getByRole('img', { name: 'OBI preview', exact: true })
  const generated = decodeURIComponent((await preview.getAttribute('src'))!)
  expect(generated).toContain('data-obi-panel="front"')
  const source = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 1200
    const context = canvas.getContext('2d')!
    context.fillStyle = '#00ffff'
    context.fillRect(0, 0, 800, 1200)
    return canvas.toDataURL('image/png')
  })
  await page.getByLabel('Upload OBI paper strip', { exact: true }).setInputFiles({ name: 'sized.png', mimeType: 'image/png', buffer: Buffer.from(source.split(',')[1], 'base64') })
  const dialog = page.getByRole('dialog', { name: 'Crop image', exact: true })
  await expect(dialog.getByRole('slider', { name: 'Front flap width (mm)', exact: true })).toHaveValue('18.1')
  for (const [name, minimum, target] of [['Front flap width (mm)', 5, 30], ['Back flap width (mm)', 5, 10], ['OBI height (mm)', 40, 90]] as const) {
    const slider = dialog.getByRole('slider', { name, exact: true })
    await slider.focus()
    await page.keyboard.press('Home')
    for (let step = 0; step < (target - minimum) * 10; step += 1) await page.keyboard.press('ArrowRight')
    await expect(slider).toHaveValue(String(target))
  }
  await expect(dialog).toContainText('OBI size 52.6 × 90.0 mm')
  await expect(dialog.locator('.crop-obi-folds span')).toHaveCount(2)
  const widthMm = 40 + 32 * 118 / 300
  const frame = (await dialog.locator('.reactEasyCrop_CropArea').boundingBox())!
  expect(frame.width / frame.height).toBeCloseTo(widthMm / 90, 3)
  const folds = await dialog.locator('.crop-obi-folds span').evaluateAll((elements) => elements.map((element) => Number.parseFloat((element as HTMLElement).style.left)))
  expect(folds[0]).toBeCloseTo(10 / widthMm * 100, 3)
  expect(folds[1]).toBeCloseTo((10 + 32 * 118 / 300) / widthMm * 100, 3)
  await page.screenshot({ path: 'test-results/obi-crop-controls-mobile.png' })
  await confirmCrop(page)
  const cropped = (await preview.getAttribute('src'))!
  const output = await preview.evaluate(async (image: HTMLImageElement) => {
    await image.decode()
    return { width: image.naturalWidth, height: image.naturalHeight }
  })
  expect(Math.abs(output.width - output.height * widthMm / 90)).toBeLessThanOrEqual(1)
  await page.getByRole('button', { name: 'Recrop OBI image', exact: true }).click()
  await expect(dialog).toContainText('OBI size 52.6 × 90.0 mm')
  const frontWidth = dialog.getByRole('slider', { name: 'Front flap width (mm)', exact: true })
  await frontWidth.focus()
  await page.keyboard.press('End')
  await expect(frontWidth).toHaveValue('60')
  await dialog.getByRole('button', { name: 'Reset crop', exact: true }).click()
  await expect(frontWidth).toHaveValue('30')
  await dialog.getByRole('button', { name: 'Reset OBI size', exact: true }).click()
  await expect(frontWidth).toHaveValue('18.1')
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(preview).toHaveAttribute('src', cropped)
  await page.getByRole('button', { name: 'Add recording', exact: true }).click()
  await expect(page.locator('.album-editor')).toHaveCount(0)
  await page.reload()
  await page.getByRole('button', { name: 'Open Sized OBI by Print Artist', exact: true }).click()
  await page.getByRole('button', { name: 'Lay flat', exact: true }).click()
  const layout = await page.locator('.obi-strip').evaluate((element) => {
    const style = getComputedStyle(element)
    return ['--obi-front-width', '--obi-back-width', '--obi-height', '--obi-depth'].map((key) => Number.parseFloat(style.getPropertyValue(key)))
  })
  expect(layout[0]).toBeCloseTo(30 * 300 / 118, 5)
  expect(layout[1]).toBeCloseTo(10 * 300 / 118, 5)
  expect(layout[2]).toBeCloseTo(90 * 300 / 118, 5)
  expect(layout[3]).toBe(32)
  for (const image of await page.locator('.obi-uploaded img').all()) {
    await expect(image).toHaveAttribute('src', cropped)
    await expect(image).toHaveCSS('object-fit', 'contain')
  }
  await page.screenshot({ path: 'test-results/custom-obi-mobile.png' })
  await page.getByRole('button', { name: 'Edit recording', exact: true }).click()
  await expect(page.locator('.obi-size-controls')).toHaveCount(0)
  await page.getByRole('button', { name: 'Recrop OBI image', exact: true }).click()
  await expect(dialog.getByRole('slider', { name: 'Front flap width (mm)', exact: true })).toHaveValue('30')
  await expect(dialog.getByRole('slider', { name: 'Back flap width (mm)', exact: true })).toHaveValue('10')
  await expect(dialog.getByRole('slider', { name: 'OBI height (mm)', exact: true })).toHaveValue('90')
  await dialog.getByRole('button', { name: 'Reset OBI size', exact: true }).click()
  await expect(dialog.getByRole('slider', { name: 'Front flap width (mm)', exact: true })).toHaveValue('18.1')
  await confirmCrop(page)
  await page.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(page.locator('.album-editor')).toHaveCount(0)
  await page.reload()
  await page.getByRole('button', { name: 'Open Sized OBI by Print Artist', exact: true }).click()
  await expect(page.locator('.obi-strip')).toHaveCSS('--obi-front-width', '46px')
  await expect(page.locator('.obi-strip')).toHaveCSS('--obi-back-width', '46px')
  await expect(page.locator('.obi-strip')).toHaveCSS('--obi-height', '321.79661px')
})

test('OBI size changes stay inside the crop dialog and cancelling an upload keeps the defaults', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Add recording' }).click()
  await page.getByRole('checkbox', { name: 'Include OBI', exact: true }).check()
  const preview = page.getByRole('img', { name: 'OBI preview', exact: true })
  const generated = (await preview.getAttribute('src'))!
  const file = { name: 'scan.png', mimeType: 'image/png', buffer: await page.screenshot() }
  await page.getByLabel('Upload OBI paper strip', { exact: true }).setInputFiles(file)
  const dialog = page.getByRole('dialog', { name: 'Crop image', exact: true })
  await expect(dialog.getByRole('button', { name: 'Use crop', exact: true })).toBeEnabled()
  for (const name of ['Front flap width (mm)', 'Back flap width (mm)', 'OBI height (mm)']) {
    const slider = dialog.getByRole('slider', { name, exact: true })
    await slider.focus()
    await page.keyboard.press('End')
  }
  await expect(dialog).toContainText('OBI size 132.6 × 130.0 mm')
  const bounds = (await dialog.boundingBox())!
  const apply = (await dialog.getByRole('button', { name: 'Use crop', exact: true }).boundingBox())!
  const stage = (await dialog.locator('.crop-stage').boundingBox())!
  expect(bounds.x).toBeGreaterThanOrEqual(0)
  expect(bounds.y).toBeGreaterThanOrEqual(0)
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(320)
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(640)
  expect(stage.height).toBeGreaterThanOrEqual(120)
  expect(apply.y + apply.height).toBeLessThanOrEqual(bounds.y + bounds.height)
  await page.screenshot({ path: 'test-results/obi-crop-controls-small-phone.png' })
  await dialog.getByRole('button', { name: 'Cancel upload', exact: true }).click()
  await expect(preview).toHaveAttribute('src', generated)
  await expect(page.locator('.obi-size-controls')).toHaveCount(0)
  await page.getByLabel('Upload OBI paper strip', { exact: true }).setInputFiles(file)
  await expect(dialog.getByRole('slider', { name: 'Front flap width (mm)', exact: true })).toHaveValue('18.1')
  await expect(dialog.getByRole('slider', { name: 'Back flap width (mm)', exact: true })).toHaveValue('18.1')
  await expect(dialog.getByRole('slider', { name: 'OBI height (mm)', exact: true })).toHaveValue('126.6')
  await page.keyboard.press('Escape')
})
