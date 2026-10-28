import { test, expect, type Locator, type Page } from '@playwright/test'
import { confirmCrop, dismissArtworkAlert, selectBookletPage } from './helpers/artwork'

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
      quadrants: [[.25, .25], [.75, .25], [.25, .75], [.75, .75]].map(([x, y]) =>
        [...context.getImageData(Math.floor(canvas.width * x), Math.floor(canvas.height * y), 1, 1).data]),
      offAxis: [[.75, .55], [.75, .7]].map(([x, y]) =>
        [...context.getImageData(Math.floor(canvas.width * x), Math.floor(canvas.height * y), 1, 1).data]),
    }
  })
}

async function quadrantImage(page: Page) {
  const source = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 900
    canvas.height = 600
    const context = canvas.getContext('2d')!
    for (const [index, color] of ['#ff0000', '#00ff00', '#0000ff', '#ffff00'].entries()) {
      context.fillStyle = color
      context.fillRect(index % 2 * 450, Math.floor(index / 2) * 300, 450, 300)
    }
    return canvas.toDataURL('image/png')
  })
  return { name: 'quadrants.png', mimeType: 'image/png', buffer: Buffer.from(source.split(',')[1], 'base64') }
}

async function setSpineWidth(page: Page, width: number) {
  const slider = page.getByRole('slider', { name: 'Spine width (mm)', exact: true })
  await slider.focus()
  await page.keyboard.press('Home')
  for (let step = 0; step < Math.round((width - 2) * 10); step += 1) await page.keyboard.press('ArrowRight')
  await expect(slider).toHaveValue(String(width))
}

async function spineImage(page: Page, solid = false) {
  const source = await page.evaluate((uniform) => {
    const canvas = document.createElement('canvas')
    canvas.width = 200
    canvas.height = 1180
    const context = canvas.getContext('2d')!
    context.fillStyle = uniform ? '#aa44ff' : '#00ff00'
    context.fillRect(0, 0, 200, 1180)
    if (!uniform) {
      context.fillStyle = '#ff0000'; context.fillRect(0, 0, 60, 1180)
      context.fillStyle = '#0000ff'; context.fillRect(140, 0, 60, 1180)
    }
    return canvas.toDataURL('image/png')
  }, solid)
  return { name: 'spine.png', mimeType: 'image/png', buffer: Buffer.from(source.split(',')[1], 'base64') }
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

test('paper ratios stay independent of outer thickness and the disc has a circular guide on mobile', async ({ page }) => {
  await draft(page)
  await page.setViewportSize({ width: 390, height: 844 })
  const file = await stripedImage(page)
  for (const [count, upload, ratio, alt] of [
    ['1', 'Upload spine artwork', '13:236', 'Spine preview'],
    ['1', 'Upload OBI paper strip', '178.983050:307.627119', 'OBI preview'],
    ['1', 'Upload back cover artwork', '69:59', 'Back cover preview'],
    ['4', 'Upload inside back cover', '69:59', 'Back cover inside preview'],
    ['4', 'Upload right spine artwork', '13:236', 'Right spine preview'],
    ['4', 'Upload OBI paper strip', '178.983050:307.627119', 'OBI preview'],
    ['4', 'Upload disc artwork', '1:1', 'Disc preview'],
  ]) {
    await page.getByLabel('Number of discs').selectOption(count)
    if (upload === 'Upload OBI paper strip') await page.getByRole('checkbox', { name: 'Include OBI', exact: true }).check()
    await page.getByLabel(upload, { exact: true }).setInputFiles(file)
    const dialog = page.getByRole('dialog', { name: 'Crop image', exact: true })
    if (upload.includes('spine artwork')) {
      const slider = dialog.getByRole('slider', { name: 'Spine width (mm)', exact: true })
      await expect(slider).toHaveValue('6.5')
      const frame = (await dialog.locator('.reactEasyCrop_CropArea').boundingBox())!
      expect(frame.width / frame.height).toBeCloseTo(Number(await slider.inputValue()) / 118, 3)
    } else if (upload === 'Upload OBI paper strip') await expect(dialog).toContainText('OBI size')
    else await expect(dialog).toContainText(`Fixed ratio ${ratio}`)
    if (upload === 'Upload OBI paper strip' && count === '4') {
      const thickness = dialog.getByRole('slider', { name: 'Side / outer case thickness (mm)', exact: true })
      await expect(thickness).toHaveValue('10.4')
      await expect(thickness).toBeDisabled()
    }
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
      // 实物盘面印刷范围：内径 23 mm、外径 116 mm（整张光盘 120 mm）。
      expect(hole.width / circle.width).toBeCloseTo(23 / 120, 2)
      const rim = (await dialog.locator('.crop-disc-rim').boundingBox())!
      expect(rim.width / circle.width).toBeCloseTo(116 / 120, 2)
      await page.screenshot({ path: 'test-results/disc-crop-mobile.png' })
    }
    await confirmCrop(page)
    const result = await pixels(page.getByRole('img', { name: alt, exact: true }))
    const [width, height] = ratio.split(':').map(Number)
    const aspect = width / height
    expect(Math.abs(result.width - result.height * aspect)).toBeLessThanOrEqual(1)
    if (ratio === '69:59') {
      const preview = (await page.getByRole('img', { name: alt, exact: true }).locator('..').boundingBox())!
      expect(preview.width / preview.height).toBeCloseTo(69 / 59, 2)
    }
    if (upload.includes('spine artwork')) await page.getByRole('button', { name: upload.includes('right') ? 'Use generated right spine' : 'Use generated spine', exact: true }).click()
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
  await dialog.getByRole('slider', { name: 'Rotation', exact: true }).fill('90')
  await dialog.getByRole('button', { name: 'Use crop', exact: true }).click()
  await expect(dialog.getByRole('status')).toHaveText('Image 2 of 2')
  await expect(zoom).toHaveValue('1')
  await expect(dialog.getByRole('slider', { name: 'Rotation', exact: true })).toHaveValue('0')
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(page.locator('.booklet-pages-editor li')).toHaveCount(1)
  await expect(page.getByRole('textbox', { name: 'Page 1 title', exact: true })).toHaveValue('Existing lyrics')
  await page.getByLabel('Upload booklet pages', { exact: true }).setInputFiles(files)
  await confirmCrop(page, 2)
  await expect(page.getByRole('combobox', { name: 'Choose an inner page to edit', exact: true }).locator('option')).toHaveCount(3)
  for (const number of [2, 3]) {
    await selectBookletPage(page, number)
    const result = await pixels(page.locator('.booklet-pages-editor li img'))
    expect(result.width).toBe(result.height)
  }
})

test('rotation controls change exported pixels, reset orientation and preserve the result after reload', async ({ page }) => {
  await draft(page)
  await page.setViewportSize({ width: 390, height: 844 })
  const file = await quadrantImage(page)
  await page.getByLabel('Upload cover artwork', { exact: true }).setInputFiles(file)
  const dialog = page.getByRole('dialog', { name: 'Crop image', exact: true })
  const rotation = dialog.getByRole('slider', { name: 'Rotation', exact: true })
  const zoom = dialog.getByRole('slider', { name: 'Zoom', exact: true })
  await expect(rotation).toHaveValue('0')
  await dialog.getByRole('button', { name: 'Rotate left 90°', exact: true }).click()
  await expect(rotation).toHaveValue('-90')
  await dialog.getByRole('button', { name: 'Rotate right 90°', exact: true }).click()
  await expect(rotation).toHaveValue('0')
  await rotation.fill('33')
  await expect.poll(() => dialog.locator('.reactEasyCrop_Image').evaluate((image) => (image as HTMLElement).style.transform)).toContain('rotate(33deg)')
  await dialog.getByRole('button', { name: 'Reset crop', exact: true }).click()
  await expect(rotation).toHaveValue('0')
  await expect(zoom).toHaveValue('1')
  await rotation.fill('33')
  await zoom.fill('2')
  await dialog.screenshot({ path: 'test-results/rotation-crop-mobile.png' })
  expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
  await confirmCrop(page)
  const preview = page.getByRole('img', { name: 'Cover preview', exact: true })
  const tilted = await pixels(preview)
  expect(tilted.width).toBe(tilted.height)
  expect(tilted.offAxis).toEqual([[0, 255, 0, 255], [255, 255, 0, 255]])
  await page.getByLabel('Upload cover artwork', { exact: true }).setInputFiles(file)
  await expect(rotation).toHaveValue('0')
  await dialog.getByRole('button', { name: 'Rotate right 90°', exact: true }).click()
  await confirmCrop(page)
  expect((await pixels(preview)).quadrants).toEqual([
    [0, 0, 255, 255], [255, 0, 0, 255], [255, 255, 0, 255], [0, 255, 0, 255],
  ])
  const source = (await preview.getAttribute('src'))!
  await page.getByLabel('Upload cover artwork', { exact: true }).setInputFiles(file)
  await dialog.getByRole('button', { name: 'Rotate left 90°', exact: true }).click()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(preview).toHaveAttribute('src', source)
  await page.getByRole('button', { name: 'Add recording', exact: true }).click()
  await expect(page.locator('.album-editor')).toHaveCount(0)
  await page.reload()
  await page.getByRole('button', { name: 'Open Cropped Session by Crop Artist', exact: true }).click()
  await expect(page.locator('.lid-front img')).toHaveAttribute('src', source)
})

test('rotation preserves the crop ratio and pixel orientation for every packaging image', async ({ page }) => {
  await draft(page)
  await page.setViewportSize({ width: 390, height: 844 })
  const file = await quadrantImage(page)
  await page.getByRole('checkbox', { name: 'Include OBI', exact: true }).check()
  for (const [upload, alt] of [
    ['Upload booklet back cover', 'Booklet reverse preview'],
    ['Upload back cover artwork', 'Back cover preview'],
    ['Upload inside back cover', 'Back cover inside preview'],
    ['Upload spine artwork', 'Spine preview'],
    ['Upload right spine artwork', 'Right spine preview'],
    ['Upload OBI paper strip', 'OBI preview'],
    ['Upload disc artwork', 'Disc preview'],
  ]) {
    await page.getByLabel(upload, { exact: true }).setInputFiles(file)
    const dialog = page.getByRole('dialog', { name: 'Crop image', exact: true })
    const frame = (await dialog.locator('.reactEasyCrop_CropArea').boundingBox())!
    const ratio = frame.width / frame.height
    await dialog.getByRole('button', { name: 'Rotate left 90°', exact: true }).click()
    const rotatedFrame = (await dialog.locator('.reactEasyCrop_CropArea').boundingBox())!
    expect(rotatedFrame.width / rotatedFrame.height).toBeCloseTo(ratio, 3)
    await confirmCrop(page)
    const result = await pixels(page.getByRole('img', { name: alt, exact: true }))
    expect(Math.abs(result.width - result.height * ratio)).toBeLessThanOrEqual(1)
    expect(result.quadrants, upload).toEqual([
      [0, 255, 0, 255], [255, 255, 0, 255], [255, 0, 0, 255], [0, 0, 255, 255],
    ])
  }
})

test('the paper width slider spans its bounds and persists without changing outer case thickness', async ({ page }) => {
  await draft(page)
  await page.getByRole('checkbox', { name: 'Include OBI', exact: true }).check()
  await page.setViewportSize({ width: 390, height: 844 })
  const file = await stripedImage(page)
  await page.getByLabel('Upload spine artwork', { exact: true }).setInputFiles(file)
  const dialog = page.getByRole('dialog', { name: 'Crop image', exact: true })
  const slider = dialog.getByRole('slider', { name: 'Spine width (mm)', exact: true })
  await expect(slider).toHaveValue('6.5')
  await expect(slider).toHaveAttribute('min', '2')
  await expect(slider).toHaveAttribute('max', '40')
  await expect(slider).toHaveAttribute('step', '0.1')
  const frame = dialog.locator('.reactEasyCrop_CropArea')
  const initial = (await frame.boundingBox())!
  await slider.focus()
  await page.keyboard.press('End')
  await expect(slider).toHaveValue('40')
  const wider = (await frame.boundingBox())!
  expect(wider.height).toBeCloseTo(initial.height, 1)
  expect(wider.width / wider.height).toBeCloseTo(40 / 118, 3)
  await page.keyboard.press('Home')
  await expect(slider).toHaveValue('2')
  await page.keyboard.press('ArrowLeft')
  await expect(slider).toHaveValue('2')
  await dialog.getByRole('button', { name: 'Reset crop', exact: true }).click()
  await expect(slider).toHaveValue('6.5')
  await setSpineWidth(page, 12)
  await page.screenshot({ path: 'test-results/spine-crop-mobile.png' })
  await confirmCrop(page)
  const output = await pixels(page.getByRole('img', { name: 'Spine preview', exact: true }))
  expect(Math.abs(output.width - output.height * 12 / 118)).toBeLessThanOrEqual(1)
  expect(output.center).toEqual([0, 255, 0, 255])
  const spine = (await page.getByRole('img', { name: 'Spine preview', exact: true }).getAttribute('src'))!
  await page.getByLabel('Upload spine artwork', { exact: true }).setInputFiles(file)
  await expect(slider).toHaveValue('12')
  await setSpineWidth(page, 2)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('img', { name: 'Spine preview', exact: true })).toHaveAttribute('src', spine)
  await page.getByRole('button', { name: 'Add recording', exact: true }).click()
  await expect(page.locator('.album-editor')).toHaveCount(0)
  await page.reload()
  const album = page.getByRole('button', { name: 'Open Cropped Session by Crop Artist', exact: true })
  await album.click()
  await expect(page.locator('.case-spine img')).toHaveAttribute('src', spine)
  await expect(page.locator('.case-spine img')).toHaveCSS('object-fit', 'contain')
  const dimensions = await page.locator('.cd-case').evaluate((element) => Number.parseFloat(getComputedStyle(element).getPropertyValue('--case-depth')))
  expect(dimensions).toBeCloseTo(10.4 / 118 * 300, 5)
  expect(await page.locator('.case-spine img').evaluate((element) => Number.parseFloat(getComputedStyle(element).width))).toBeCloseTo(12 / 118 * 300, 1)
  await expect(page.locator('.case-spine')).toHaveCSS('width', await page.locator('.case-spine-right').evaluate((element) => getComputedStyle(element).width))
  expect(await page.locator('.obi-strip').evaluate((element) => Number.parseFloat(getComputedStyle(element).getPropertyValue('--obi-width')))).toBeCloseTo(60 * 300 / 118 + dimensions, 4)
  await page.getByRole('button', { name: 'Edit recording', exact: true }).click()
  await page.getByLabel('Number of discs').selectOption('4')
  await page.getByLabel('Upload spine artwork', { exact: true }).setInputFiles(file)
  await expect(slider).toHaveValue('12')
  await page.keyboard.press('Escape')
})

test('right spine crops use paper width in multi-disc cases and keep narrow scans filled when widened', async ({ page }) => {
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
  const slider = dialog.getByRole('slider', { name: 'Spine width (mm)', exact: true })
  await expect(slider).toHaveValue('6.5')
  const initial = (await dialog.locator('.reactEasyCrop_CropArea').boundingBox())!
  expect(initial.width / initial.height).toBeCloseTo(6.5 / 118, 3)
  await slider.focus()
  await page.keyboard.press('End')
  await expect.poll(async () => Number(await dialog.getByRole('slider', { name: 'Zoom', exact: true }).inputValue())).toBeCloseTo(40 / 118 / (60 / 1000), 4)
  await confirmCrop(page)
  const output = await pixels(page.getByRole('img', { name: 'Right spine preview', exact: true }))
  expect(Math.abs(output.width - output.height * 40 / 118)).toBeLessThanOrEqual(1)
  expect(output.corner).toEqual([0, 255, 0, 255])
  expect(output.center).toEqual([0, 255, 0, 255])
  await page.getByLabel('Upload cover artwork', { exact: true }).setInputFiles(await stripedImage(page))
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('Fixed ratio 1:1')
  await expect(slider).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await page.getByLabel('Upload back cover artwork', { exact: true }).setInputFiles(await stripedImage(page))
  await expect(dialog).toBeVisible()
  await expect(slider).toHaveCount(0)
  await expect(dialog).toContainText('Fixed ratio 69:59')
  await page.keyboard.press('Escape')
})

for (const firstSide of ['left', 'right'] as const) {
  test(`both spines use the thinner crop when the ${firstSide} image is uploaded first`, async ({ page }) => {
    await draft(page)
    const firstLabel = firstSide === 'left' ? 'Upload spine artwork' : 'Upload right spine artwork'
    const secondLabel = firstSide === 'left' ? 'Upload right spine artwork' : 'Upload spine artwork'
    const firstPreview = page.getByRole('img', { name: firstSide === 'left' ? 'Spine preview' : 'Right spine preview', exact: true })
    const secondPreview = page.getByRole('img', { name: firstSide === 'left' ? 'Right spine preview' : 'Spine preview', exact: true })
    const file = await spineImage(page)
    const secondFile = await spineImage(page, true)
    await page.getByLabel(firstLabel, { exact: true }).setInputFiles(file)
    await setSpineWidth(page, 20)
    await confirmCrop(page)
    expect((await pixels(firstPreview)).corner).toEqual([255, 0, 0, 255])
    const original = (await firstPreview.getAttribute('src'))!
    await page.getByLabel(secondLabel, { exact: true }).setInputFiles(secondFile)
    await setSpineWidth(page, 2)
    await page.keyboard.press('Escape')
    await expect(page.locator('.artwork-cropper')).toHaveCount(0)
    await expect(firstPreview).toHaveAttribute('src', original)
    await expect(secondPreview).toHaveAttribute('src', /^data:image\/svg\+xml/)
    await page.getByLabel(secondLabel, { exact: true }).setInputFiles(secondFile)
    await setSpineWidth(page, 6)
    await confirmCrop(page)
    await expect(firstPreview).not.toHaveAttribute('src', original)
    for (const preview of [firstPreview, secondPreview]) {
      const result = await pixels(preview)
      expect(Math.abs(result.width - result.height * 6 / 118)).toBeLessThanOrEqual(1)
    }
    expect((await pixels(firstPreview)).corner).toEqual([0, 255, 0, 255])
    expect((await pixels(secondPreview)).corner).toEqual([170, 68, 255, 255])
    const alignedFirst = (await firstPreview.getAttribute('src'))!
    await page.getByLabel(secondLabel, { exact: true }).setInputFiles(secondFile)
    await setSpineWidth(page, 12)
    await confirmCrop(page)
    await expect(firstPreview).toHaveAttribute('src', alignedFirst)
    const widerSecond = await pixels(secondPreview)
    expect(Math.abs(widerSecond.width - widerSecond.height * 6 / 118)).toBeLessThanOrEqual(1)
    await page.getByRole('button', { name: 'Add recording', exact: true }).click()
    await expect(page.locator('.album-editor')).toHaveCount(0)
    await page.reload()
    const album = page.getByRole('button', { name: 'Open Cropped Session by Crop Artist', exact: true })
    expect(await album.locator('..').evaluate((element) => Number((element as HTMLElement).style.getPropertyValue('--spine-units')))).toBe(1)
    await album.click()
    expect(await page.locator('.cd-case').evaluate((element) => Number.parseFloat(getComputedStyle(element).getPropertyValue('--case-depth')))).toBeCloseTo(10.4 / 118 * 300, 5)
    await page.getByRole('button', { name: 'Edit recording', exact: true }).click()
    await expect(firstPreview).toHaveAttribute('src', alignedFirst)
    await page.getByRole('button', { name: 'Use generated spine', exact: true }).click()
    await page.getByRole('button', { name: 'Use generated right spine', exact: true }).click()
    const generated = (await firstPreview.locator('..').boundingBox())!
    expect(generated.height / generated.width).toBeCloseTo(6.5 / 118, 2)
    await page.getByRole('button', { name: 'Save changes', exact: true }).click()
    await expect(page.locator('.album-editor')).toHaveCount(0)
    await page.reload()
    await album.click()
    expect(await page.locator('.cd-case').evaluate((element) => Number.parseFloat(getComputedStyle(element).getPropertyValue('--case-depth')))).toBeCloseTo(10.4 / 118 * 300, 5)
  })
}

test('a failed automatic recrop preserves both images and the existing thickness', async ({ page }) => {
  await draft(page)
  await page.getByLabel('Upload spine artwork', { exact: true }).setInputFiles(await spineImage(page))
  await setSpineWidth(page, 20)
  await confirmCrop(page)
  const preview = page.getByRole('img', { name: 'Spine preview', exact: true })
  const source = (await preview.getAttribute('src'))!
  await page.evaluate((target) => {
    const decode = HTMLImageElement.prototype.decode
    HTMLImageElement.prototype.decode = function () {
      if (this.src === target) return Promise.reject(new DOMException('Cannot decode', 'EncodingError'))
      return decode.call(this)
    }
  }, source)
  await page.getByLabel('Upload right spine artwork', { exact: true }).setInputFiles(await spineImage(page, true))
  await setSpineWidth(page, 6)
  await confirmCrop(page)
  await dismissArtworkAlert(page, 'This file could not be opened as an image.')
  await expect(preview).toHaveAttribute('src', source)
  await expect(page.getByRole('img', { name: 'Right spine preview', exact: true })).toHaveAttribute('src', /^data:image\/svg\+xml/)
  const dimensions = (await preview.locator('..').boundingBox())!
  expect(dimensions.height / dimensions.width).toBeCloseTo(20 / 118, 2)
  await expect(page.getByRole('button', { name: 'Add recording', exact: true })).toBeEnabled()
})

test('crop controls accept typed values and single-step buttons', async ({ page }) => {
  await draft(page)
  await page.getByLabel('Upload cover artwork', { exact: true }).setInputFiles(await quadrantImage(page))
  const dialog = page.getByRole('dialog', { name: 'Crop image', exact: true })
  const zoom = dialog.getByRole('slider', { name: 'Zoom', exact: true })
  const zoomValue = dialog.getByRole('spinbutton', { name: 'Zoom value', exact: true })
  await zoomValue.fill('1.5')
  await expect(zoom).toHaveValue('1.5')
  await dialog.getByRole('button', { name: 'Increase Zoom by 0.01×', exact: true }).click()
  await expect(zoom).toHaveValue('1.51')
  await expect(zoomValue).toHaveValue('1.51')
  await dialog.getByRole('button', { name: 'Decrease Zoom by 0.01×', exact: true }).click()
  await expect(zoom).toHaveValue('1.5')
  // 超出范围的输入在确认后收进范围，而不是被忽略。
  await zoomValue.fill('99')
  await zoomValue.press('Enter')
  await expect(zoom).toHaveValue('3')
  await expect(zoomValue).toHaveValue('3.00')
  const rotation = dialog.getByRole('slider', { name: 'Rotation', exact: true })
  const rotationValue = dialog.getByRole('spinbutton', { name: 'Rotation value', exact: true })
  await rotationValue.fill('-12')
  await rotationValue.blur()
  await expect(rotation).toHaveValue('-12')
  await dialog.getByRole('button', { name: 'Increase Rotation by 1°', exact: true }).click()
  await expect(rotation).toHaveValue('-11')
  await rotationValue.fill('7')
  await expect(rotation).toHaveValue('7')
  // Esc 先撤销本次输入，回到聚焦前的值，窗口保持打开。
  await rotationValue.press('Escape')
  await expect(dialog).toBeVisible()
  await expect(rotation).toHaveValue('-11')
  await expect(rotationValue).toHaveValue('-11')
  await dialog.getByRole('button', { name: 'Reset crop', exact: true }).click()
  await expect(rotationValue).toHaveValue('0')
  await expect(zoomValue).toHaveValue('1.00')
})

test('spine previews lie horizontally across the editor while crops stay vertical', async ({ page }) => {
  await draft(page)
  await page.getByLabel('Number of discs').selectOption('4')
  await page.getByLabel('Upload spine artwork', { exact: true }).setInputFiles(await spineImage(page))
  const dialog = page.getByRole('dialog', { name: 'Crop image', exact: true })
  const frame = (await dialog.locator('.reactEasyCrop_CropArea').boundingBox())!
  expect(frame.height).toBeGreaterThan(frame.width)
  await setSpineWidth(page, 12)
  await confirmCrop(page)
  const image = page.getByRole('img', { name: 'Spine preview', exact: true })
  const output = await pixels(image)
  expect(output.height).toBeGreaterThan(output.width)
  for (const name of ['Spine preview', 'Right spine preview']) {
    const box = (await page.getByRole('img', { name, exact: true }).locator('..').boundingBox())!
    expect(box.width / box.height).toBeCloseTo(118 / 12, 1)
    // 旋转后的图片正好铺满横放的预览框。
    const drawn = (await page.getByRole('img', { name, exact: true }).boundingBox())!
    expect(drawn.width).toBeCloseTo(box.width, 0)
    expect(drawn.height).toBeCloseTo(box.height, 0)
  }
  await page.locator('.editor-artwork').screenshot({ path: 'test-results/spine-preview-horizontal.png' })
})
