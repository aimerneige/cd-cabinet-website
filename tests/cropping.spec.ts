import { test, expect, type Locator, type Page } from '@playwright/test'
import { confirmCrop } from './helpers/artwork'

async function draft(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await expect(page.locator('.shelf-cd')).toHaveCount(24)
  await page.getByRole('button', { name: 'Add recording' }).click()
  await page.getByRole('textbox', { name: 'Album title', exact: true }).fill('Cropped Session')
  await page.getByRole('textbox', { name: 'Artist', exact: true }).fill('Crop Artist')
}

async function stripedImage(page: Page) {
  const source = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 900
    canvas.height = 600
    const context = canvas.getContext('2d')!
    for (const [index, color] of ['#ff0000', '#00ff00', '#0000ff'].entries()) {
      context.fillStyle = color
      context.fillRect(index * 300, 0, 300, 600)
    }
    return canvas.toDataURL('image/png')
  })
  return { name: 'stripes.png', mimeType: 'image/png', buffer: Buffer.from(source.split(',')[1], 'base64') }
}

async function pixels(preview: Locator) {
  return preview.evaluate(async (element) => {
    const image = element as HTMLImageElement
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const context = canvas.getContext('2d')!
    context.drawImage(image, 0, 0)
    return {
      width: canvas.width, height: canvas.height,
      corner: [...context.getImageData(2, 2, 1, 1).data],
      center: [...context.getImageData(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1).data],
    }
  })
}

test('cropping changes actual pixels, supports zoom and movement, and survives cancelling a replacement and reload', async ({ page }) => {
  await draft(page)
  const file = await stripedImage(page)
  await page.getByLabel('Upload cover artwork', { exact: true }).setInputFiles(file)
  const dialog = page.getByRole('dialog', { name: 'Crop image', exact: true })
  await expect(dialog).toContainText('Fixed ratio 1:1')
  await expect(dialog.getByRole('button', { name: 'Use crop', exact: true })).toBeEnabled()
  const media = dialog.locator('.reactEasyCrop_Image')
  const originalTransform = await media.evaluate((element) => (element as HTMLElement).style.transform)
  await dialog.getByLabel('Crop position', { exact: true }).focus()
  await page.keyboard.press('ArrowRight')
  await expect.poll(() => media.evaluate((element) => (element as HTMLElement).style.transform)).not.toBe(originalTransform)
  const zoom = dialog.getByRole('slider', { name: 'Zoom', exact: true })
  await zoom.focus()
  await page.keyboard.press('End')
  await expect(zoom).toHaveValue('3')
  await dialog.getByRole('button', { name: 'Reset crop', exact: true }).click()
  await expect(zoom).toHaveValue('1')
  await expect.poll(() => media.evaluate((element) => (element as HTMLElement).style.transform)).toBe(originalTransform)
  await zoom.focus()
  await page.keyboard.press('End')
  await expect(zoom).toHaveValue('3')
  await confirmCrop(page)
  const preview = page.getByRole('img', { name: 'Cover preview', exact: true })
  const cropped = await pixels(preview)
  expect(cropped.width).toBe(cropped.height)
  expect(cropped.width).toBeLessThan(600)
  expect(cropped.corner).toEqual([0, 255, 0, 255])
  expect(cropped.center).toEqual([0, 255, 0, 255])
  const source = (await preview.getAttribute('src'))!
  await page.getByLabel('Upload cover artwork', { exact: true }).setInputFiles(file)
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(page.locator('.album-editor')).toBeVisible()
  await expect(preview).toHaveAttribute('src', source)
  await expect(page.getByRole('button', { name: 'Add recording', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Add recording', exact: true }).click()
  await expect(page.locator('.album-editor')).toHaveCount(0)
  await page.reload()
  await page.getByRole('button', { name: 'Open Cropped Session by Crop Artist', exact: true }).click()
  await expect(page.locator('.lid-front img')).toHaveAttribute('src', source)
})

test('fixed ratios follow case thickness and the disc has a circular guide on mobile', async ({ page }) => {
  await draft(page)
  await page.setViewportSize({ width: 390, height: 844 })
  const file = await stripedImage(page)
  for (const [count, upload, ratio, alt] of [
    ['1', 'Upload spine artwork', '2:25', 'Spine preview'],
    ['1', 'Upload OBI paper strip', '31:76', 'OBI preview'],
    ['1', 'Upload back cover artwork', '69:59', 'Back cover preview'],
    ['4', 'Upload inside back cover', '69:59', 'Back cover inside preview'],
    ['4', 'Upload right spine artwork', '29:150', 'Right spine preview'],
    ['4', 'Upload OBI paper strip', '79:152', 'OBI preview'],
    ['4', 'Upload disc artwork', '1:1', 'Disc preview'],
  ]) {
    await page.getByLabel('Number of discs').selectOption(count)
    await page.getByLabel(upload, { exact: true }).setInputFiles(file)
    const dialog = page.getByRole('dialog', { name: 'Crop image', exact: true })
    if (upload.includes('spine artwork')) {
      await expect(dialog).toContainText('Spine width 100%')
      const frame = (await dialog.locator('.reactEasyCrop_CropArea').boundingBox())!
      const [w, h] = ratio.split(':').map(Number)
      expect(frame.width / frame.height).toBeCloseTo(w / h, 3)
    } else await expect(dialog).toContainText(`Fixed ratio ${ratio}`)
    await expect(dialog.getByRole('button', { name: 'Use crop', exact: true })).toBeEnabled()
    const box = (await dialog.boundingBox())!
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.y).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(390)
    expect(box.y + box.height).toBeLessThanOrEqual(844)
    if (upload === 'Upload disc artwork') {
      await expect(dialog.locator('.reactEasyCrop_CropAreaRound')).toBeVisible()
      const hole = (await dialog.locator('.crop-disc-hole').boundingBox())!
      const circle = (await dialog.locator('.reactEasyCrop_CropAreaRound').boundingBox())!
      expect(hole.width / circle.width).toBeCloseTo(0.21, 2)
      await page.screenshot({ path: 'test-results/disc-crop-mobile.png' })
    }
    await confirmCrop(page)
    const result = await pixels(page.getByRole('img', { name: alt, exact: true }))
    const [width, height] = ratio.split(':').map(Number)
    expect(result.width / result.height).toBe(width / height)
    if (ratio === '69:59') {
      const preview = (await page.getByRole('img', { name: alt, exact: true }).locator('..').boundingBox())!
      expect(preview.width / preview.height).toBeCloseTo(69 / 59, 2)
    }
  }
})

test('booklet crops are confirmed individually and cancelling a batch preserves existing pages', async ({ page }) => {
  await draft(page)
  const file = await stripedImage(page)
  await page.getByRole('button', { name: 'Add text page', exact: true }).click()
  await page.getByRole('textbox', { name: 'Page 1 title', exact: true }).fill('Existing lyrics')
  const files = [file, { ...file, name: 'second.png' }]
  await page.getByLabel('Upload booklet pages', { exact: true }).setInputFiles(files)
  const dialog = page.getByRole('dialog', { name: 'Crop image', exact: true })
  await expect(dialog.getByRole('status')).toHaveText('Image 1 of 2')
  const zoom = dialog.getByRole('slider', { name: 'Zoom', exact: true })
  await zoom.focus()
  await page.keyboard.press('End')
  await dialog.getByRole('button', { name: 'Use crop', exact: true }).click()
  await expect(dialog.getByRole('status')).toHaveText('Image 2 of 2')
  await expect(zoom).toHaveValue('1')
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(page.locator('.booklet-pages-editor li')).toHaveCount(1)
  await expect(page.getByRole('textbox', { name: 'Page 1 title', exact: true })).toHaveValue('Existing lyrics')
  await page.getByLabel('Upload booklet pages', { exact: true }).setInputFiles(files)
  await confirmCrop(page, 2)
  await expect(page.locator('.booklet-pages-editor li')).toHaveCount(3)
  for (const image of await page.locator('.booklet-pages-editor li img').all()) {
    const result = await pixels(image)
    expect(result.width).toBe(result.height)
  }
})

test('spine crop edges resize directly within bounds, reset and persist the selected crop', async ({ page }) => {
  await draft(page)
  await page.setViewportSize({ width: 390, height: 844 })
  const file = await stripedImage(page)
  await page.getByLabel('Upload spine artwork', { exact: true }).setInputFiles(file)
  const dialog = page.getByRole('dialog', { name: 'Crop image', exact: true })
  const right = dialog.getByRole('slider', { name: 'Adjust right crop edge', exact: true })
  const left = dialog.getByRole('slider', { name: 'Adjust left crop edge', exact: true })
  await expect(right).toHaveAttribute('aria-valuenow', '100')
  const frame = dialog.locator('.reactEasyCrop_CropArea')
  const initial = (await frame.boundingBox())!
  const handle = (await right.boundingBox())!
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2)
  await page.mouse.down()
  await page.mouse.move(handle.x + handle.width / 2 + 80, handle.y + handle.height / 2)
  await page.mouse.up()
  await expect(right).toHaveAttribute('aria-valuenow', '125')
  const wider = (await frame.boundingBox())!
  expect(wider.height).toBeCloseTo(initial.height, 1)
  expect(wider.width / initial.width).toBeCloseTo(1.25, 2)
  await left.focus()
  await page.keyboard.press('Home')
  await expect(left).toHaveAttribute('aria-valuenow', '75')
  await page.keyboard.press('ArrowLeft')
  await expect(left).toHaveAttribute('aria-valuenow', '75')
  await dialog.getByRole('button', { name: 'Reset crop', exact: true }).click()
  await expect(right).toHaveAttribute('aria-valuenow', '100')
  await right.focus()
  await page.keyboard.press('End')
  await expect(right).toHaveAttribute('aria-valuenow', '125')
  await page.screenshot({ path: 'test-results/spine-crop-mobile.png' })
  await confirmCrop(page)
  const output = await pixels(page.getByRole('img', { name: 'Spine preview', exact: true }))
  expect(Math.abs(output.width - output.height * 0.1)).toBeLessThanOrEqual(1)
  expect(output.center).toEqual([0, 255, 0, 255])
  const spine = (await page.getByRole('img', { name: 'Spine preview', exact: true }).getAttribute('src'))!
  await page.getByLabel('Upload spine artwork', { exact: true }).setInputFiles(file)
  await expect(right).toHaveAttribute('aria-valuenow', '100')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('img', { name: 'Spine preview', exact: true })).toHaveAttribute('src', spine)
  await page.getByRole('button', { name: 'Add recording', exact: true }).click()
  await expect(page.locator('.album-editor')).toHaveCount(0)
  await page.reload()
  const album = page.getByRole('button', { name: 'Open Cropped Session by Crop Artist', exact: true })
  await album.click()
  await expect(page.locator('.case-spine img')).toHaveAttribute('src', spine)
  await expect(page.locator('.case-spine img')).toHaveCSS('object-fit', 'contain')
})

test('right spine crops start from the fatbox width and keep narrow scans filled when widened', async ({ page }) => {
  await draft(page)
  await page.getByLabel('Number of discs').selectOption('4')
  const source = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 60
    canvas.height = 1000
    const context = canvas.getContext('2d')!
    context.fillStyle = '#00ff00'
    context.fillRect(0, 0, 60, 1000)
    return canvas.toDataURL('image/png')
  })
  await page.getByLabel('Upload right spine artwork', { exact: true }).setInputFiles({ name: 'narrow.png', mimeType: 'image/png', buffer: Buffer.from(source.split(',')[1], 'base64') })
  const dialog = page.getByRole('dialog', { name: 'Crop image', exact: true })
  const handle = dialog.getByRole('slider', { name: 'Adjust right crop edge', exact: true })
  await expect(handle).toHaveAttribute('aria-valuenow', '100')
  const initial = (await dialog.locator('.reactEasyCrop_CropArea').boundingBox())!
  expect(initial.width / initial.height).toBeCloseTo(58 / 300, 3)
  await handle.focus()
  await page.keyboard.press('End')
  await expect(dialog.getByRole('slider', { name: 'Zoom', exact: true })).toHaveValue('1.25')
  await confirmCrop(page)
  const output = await pixels(page.getByRole('img', { name: 'Right spine preview', exact: true }))
  expect(Math.abs(output.width - output.height * (58 / 300 * 1.25))).toBeLessThanOrEqual(1)
  expect(output.corner).toEqual([0, 255, 0, 255])
  expect(output.center).toEqual([0, 255, 0, 255])
  await page.getByLabel('Upload cover artwork', { exact: true }).setInputFiles(await stripedImage(page))
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('Fixed ratio 1:1')
  await expect(dialog.getByRole('slider', { name: /crop edge/ })).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await page.getByLabel('Upload back cover artwork', { exact: true }).setInputFiles(await stripedImage(page))
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('slider', { name: /crop edge/ })).toHaveCount(0)
  await expect(dialog).toContainText('Fixed ratio 69:59')
  await page.keyboard.press('Escape')
})
