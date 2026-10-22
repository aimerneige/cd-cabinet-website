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
    ['4', 'Upload right spine artwork', '29:150', 'Right spine preview'],
    ['4', 'Upload OBI paper strip', '79:152', 'OBI preview'],
    ['4', 'Upload disc artwork', '1:1', 'Disc preview'],
  ]) {
    await page.getByLabel('Number of discs').selectOption(count)
    await page.getByLabel(upload, { exact: true }).setInputFiles(file)
    const dialog = page.getByRole('dialog', { name: 'Crop image', exact: true })
    await expect(dialog).toContainText(`Fixed ratio ${ratio}`)
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
