import { test, expect, type Page } from '@playwright/test'
import { confirmCrop } from './helpers/artwork'

async function draft(page: Page, title = 'Format Session') {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await expect(page.locator('.shelf-cd')).toHaveCount(24)
  await page.getByRole('button', { name: 'Add recording' }).click()
  await page.getByRole('textbox', { name: 'Album title', exact: true }).fill(title)
  await page.getByRole('textbox', { name: 'Artist', exact: true }).fill('Format Artist')
}

async function bandedImage(page: Page, colors: string[], width = 900, height = 600) {
  const source = await page.evaluate(({ colors, width, height }) => {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')!
    // 面积依次递减，便于确认三个主色的先后。
    const shares = [0.5, 0.3, 0.2]
    let x = 0
    colors.forEach((color, index) => {
      context.fillStyle = color
      context.fillRect(x, 0, width * shares[index], height)
      x += width * shares[index]
    })
    return canvas.toDataURL('image/png')
  }, { colors, width, height })
  return { name: 'bands.png', mimeType: 'image/png', buffer: Buffer.from(source.split(',')[1], 'base64') }
}

test('each disc can be marked as CD, DVD or Blu-ray and every disc label is tiled in the editor', async ({ page }) => {
  await draft(page)
  await page.getByLabel('Number of discs').selectOption('3')
  await expect(page.locator('.disc-artworks .disc-artwork')).toHaveCount(3)
  for (const number of [1, 2, 3]) await expect(page.getByRole('img', { name: `Disc ${number} preview`, exact: true })).toBeVisible()
  await page.getByRole('combobox', { name: 'Disc 2 type', exact: true }).selectOption('dvd')
  await page.getByRole('combobox', { name: 'Disc 3 type', exact: true }).selectOption('bd')
  const label = (name: string) => page.getByRole('img', { name, exact: true }).getAttribute('src').then((src) => decodeURIComponent(src!))
  expect(await label('Disc 1 preview')).toContain('COMPACT DISC · DIGITAL AUDIO')
  expect(await label('Disc 2 preview')).toContain('DVD VIDEO')
  expect(await label('Disc 3 preview')).toContain('BLU-RAY DISC')
  expect(await label('Back cover preview')).toContain('1 CD + 1 DVD + 1 BD')
  await page.getByRole('button', { name: 'Add recording', exact: true }).click()
  await expect(page.locator('.album-editor')).toHaveCount(0)
  await page.reload()
  // 书架上不再显示 “3CD” 角标。
  const shelf = page.getByRole('button', { name: 'Open Format Session by Format Artist', exact: true })
  await expect(shelf).not.toContainText('CD')
  await shelf.click()
  await expect(page.locator('.album-meta')).toContainText('1 CD + 1 DVD + 1 BD')
  await expect(page.getByRole('button', { name: 'Disc 3 BD', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Disc 3 BD', exact: true }).click()
  await expect(page.locator('.selected-disc-label')).toHaveText('DISC 3 / 3 · BD')
  await expect(page.locator('.cd-case [data-disc-id][data-format="bd"]')).toHaveCount(1)
  await page.getByRole('button', { name: 'Edit recording', exact: true }).click()
  await expect(page.getByRole('combobox', { name: 'Disc 3 type', exact: true })).toHaveValue('bd')
  await expect(page.getByRole('combobox', { name: 'Disc 1 type', exact: true })).toHaveValue('cd')
})

test('clicking any visible disc plays it and the tray corners turn the pages', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.locator('[data-album-id="album-18"]').click()
  await expect(page.locator('.viewer-controls')).toHaveCSS('opacity', '1')
  // 光盘编号只在右下角显示，托盘上不再叠加文字。
  await expect(page.locator('.tray-disc-label')).toHaveCount(0)
  await expect(page.locator('.selected-disc-label')).toHaveText('DISC 1 / 3')
  await expect(page.locator('.tray-back .tray-corner')).toHaveCount(0)
  await page.locator('.tray-front .tray-corner-bottom').click()
  await expect(page.locator('.selected-disc-label')).toHaveText('DISC 2 / 3')
  await expect(page.locator('.tray-leaf')).toHaveCSS('transform', /matrix3d/)
  // 已经是最后一页，右侧不再有翻页角；左侧可以翻回。
  await expect(page.locator('.tray-front .tray-corner')).toHaveCount(0)
  await page.locator('.tray-back .tray-corner-top').click()
  await expect(page.locator('.selected-disc-label')).toHaveText('DISC 1 / 3')
  await page.locator('.tray-front .tray-corner-top').click()
  await expect(page.locator('.selected-disc-label')).toHaveText('DISC 2 / 3')
  await page.getByRole('button', { name: 'Play disc 3 from the beginning', exact: true }).click()
  await expect(page.getByRole('region', { name: 'CD player', exact: true })).toBeVisible()
  await expect(page.locator('.selected-disc-label')).toHaveText('DISC 3 / 3')
  await expect(page.getByRole('button', { name: 'Disc 3', exact: true })).toHaveAttribute('aria-pressed', 'true')
})

test('the album viewer scrolls so the reading buttons are reachable in a short window', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 1280, height: 600 })
  await page.goto('/')
  await page.locator('[data-album-id="album-18"]').click()
  await expect(page.locator('.viewer-controls')).toHaveCSS('opacity', '1')
  const read = page.getByRole('button', { name: 'Read booklet', exact: true })
  expect((await read.boundingBox())!.y).toBeGreaterThan(600)
  await page.mouse.move(640, 300)
  await page.mouse.wheel(0, 1200)
  await expect.poll(() => page.locator('.active-layer').evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
  const box = (await read.boundingBox())!
  expect(box.y + box.height).toBeLessThanOrEqual(600)
  await read.click()
  await expect(page.locator('.artwork-reader')).toBeVisible()
})

test('spine width changes keep a crop that touches an image edge on that edge', async ({ page }) => {
  await draft(page)
  await page.getByLabel('Upload spine artwork', { exact: true }).setInputFiles(await bandedImage(page, ['#ff0000', '#00ff00', '#0000ff']))
  const dialog = page.getByRole('dialog', { name: 'Crop image', exact: true })
  const frame = dialog.locator('.reactEasyCrop_CropArea')
  const media = dialog.locator('.reactEasyCrop_Image')
  const width = dialog.getByRole('slider', { name: 'Spine width (mm)', exact: true })
  const edges = async () => {
    const [crop, image] = [(await frame.boundingBox())!, (await media.boundingBox())!]
    return { left: crop.x - image.x, right: image.x + image.width - (crop.x + crop.width) }
  }
  // 方向键移动的是图片：向右移图片，框就到了图片最左侧。
  await frame.focus()
  for (let step = 0; step < 120; step++) await page.keyboard.press('ArrowRight')
  await expect.poll(async () => (await edges()).left).toBeCloseTo(0, 0)
  for (const value of ['20', '4', '30']) {
    await width.fill(value)
    await expect(width).toHaveValue(value)
    await expect.poll(async () => (await edges()).left).toBeCloseTo(0, 0)
  }
  await frame.focus()
  for (let step = 0; step < 120; step++) await page.keyboard.press('ArrowLeft')
  await expect.poll(async () => (await edges()).right).toBeCloseTo(0, 0)
  for (const value of ['8', '25', '3']) {
    await width.fill(value)
    await expect.poll(async () => (await edges()).right).toBeCloseTo(0, 0)
  }
  // 不贴边时按中心伸缩。
  await dialog.getByRole('button', { name: 'Reset crop', exact: true }).click()
  await width.fill('10')
  const before = await edges()
  await width.fill('20')
  const after = await edges()
  expect(after.left).toBeCloseTo(before.left - (before.left + before.right - after.left - after.right) / 2, 0)
  expect(after.left).toBeGreaterThan(1)
  expect(after.right).toBeGreaterThan(1)
})

test('two palettes picked from the uploaded cover bring the palette count up to the theme count', async ({ page }) => {
  await draft(page, 'Palette Session')
  const palettes = page.locator('input[name="artwork-palette"]:not([value="auto"])')
  const themes = page.locator('input[name="artwork-theme"]:not([value="auto"])')
  await expect(palettes).toHaveCount(await themes.count())
  // 三个封面取色选项置顶：原色、浅色、深色。
  const order = await page.locator('input[name="artwork-palette"]').evaluateAll((inputs) => inputs.slice(0, 4).map((input) => (input as HTMLInputElement).value))
  expect(order).toEqual(['auto', 'coverLight', 'coverDark', 'cream'])
  const light = page.getByRole('radio', { name: 'Cover · light', exact: true })
  const dark = page.getByRole('radio', { name: 'Cover · dark', exact: true })
  await expect(light).toBeDisabled()
  await expect(dark).toBeDisabled()
  await page.getByLabel('Upload cover artwork', { exact: true }).setInputFiles(await bandedImage(page, ['#204060', '#f0e0c0', '#c04020'], 600, 600))
  await confirmCrop(page)
  await expect(dark).toBeEnabled()
  await dark.check()
  const back = page.getByRole('img', { name: 'Back cover preview', exact: true })
  // 深色：最暗的色调做底，最亮的做字，中间色作点缀。
  await expect.poll(async () => decodeURIComponent((await back.getAttribute('src'))!)).toContain('fill="#204060"')
  await light.check()
  await expect.poll(async () => decodeURIComponent((await back.getAttribute('src'))!)).toContain('fill="#f0e0c0"')
  await page.getByRole('button', { name: 'Add recording', exact: true }).click()
  await expect(page.locator('.album-editor')).toHaveCount(0)
  await page.reload()
  await page.getByRole('button', { name: 'Open Palette Session by Format Artist', exact: true }).click()
  await expect(page.locator('.viewer-controls')).toHaveCSS('opacity', '1')
  await page.getByRole('button', { name: 'Edit recording', exact: true }).click()
  await expect(page.getByRole('radio', { name: 'Cover · light', exact: true })).toBeChecked()
  expect(decodeURIComponent((await page.getByRole('img', { name: 'Back cover preview', exact: true }).getAttribute('src'))!)).toContain('fill="#f0e0c0"')
})
