import { test, expect, type Page } from '@playwright/test'
import { confirmCrop } from './helpers/artwork'

async function coverFile(page: Page, color: string) {
  const source = await page.evaluate((fill) => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 64
    const context = canvas.getContext('2d')!
    context.fillStyle = fill
    context.fillRect(0, 0, 64, 64)
    context.fillStyle = '#ffffff'
    context.fillRect(48, 0, 16, 64)
    context.fillStyle = '#000000'
    context.fillRect(50, 8, 12, 4)
    return canvas.toDataURL('image/png')
  }, color)
  return { name: 'cover.png', mimeType: 'image/png', buffer: Buffer.from(source.split(',')[1], 'base64') }
}

test('default covers can be changed, saved and edited without losing their design', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await expect(page.locator('.shelf-cd')).toHaveCount(24)
  await page.getByRole('button', { name: 'Add recording' }).click()
  await page.getByRole('checkbox', { name: 'Include OBI', exact: true }).check()
  const preview = page.getByRole('img', { name: 'Cover preview', exact: true })
  const discPreview = page.getByRole('img', { name: 'Disc preview', exact: true })
  const backPreview = page.getByRole('img', { name: 'Back cover preview', exact: true })
  const obiPreview = page.getByRole('img', { name: 'OBI preview', exact: true })
  await expect(preview).toHaveAttribute('src', /^data:image\/svg\+xml/)
  await expect(discPreview).toHaveAttribute('src', /^data:image\/svg\+xml/)
  await expect(backPreview).toHaveAttribute('src', /^data:image\/svg\+xml/)
  await expect(obiPreview).toHaveAttribute('src', /^data:image\/svg\+xml/)
  await page.getByRole('textbox', { name: 'Album title', exact: true }).fill('夜の音 (Live)')
  await page.getByRole('textbox', { name: 'Artist', exact: true }).fill('林 & Friends')
  let source = (await preview.getAttribute('src'))!
  expect(decodeURIComponent(source)).toContain('夜の音 (Live)')
  expect(decodeURIComponent(source)).toContain('林 &amp; Friends')
  for (let index = 0; index < 5; index++) {
    const previousDisc = (await discPreview.getAttribute('src'))!
    const previousBack = (await backPreview.getAttribute('src'))!
    const previousObi = (await obiPreview.getAttribute('src'))!
    await page.getByRole('button', { name: 'Try another cover' }).click()
    await expect(preview).not.toHaveAttribute('src', source)
    await expect(discPreview).not.toHaveAttribute('src', previousDisc)
    await expect(backPreview).not.toHaveAttribute('src', previousBack)
    await expect(obiPreview).not.toHaveAttribute('src', previousObi)
    await expect.poll(() => preview.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(1000)
    await expect.poll(() => discPreview.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(1000)
    await expect.poll(() => backPreview.evaluate((image: HTMLImageElement) => [image.naturalWidth, image.naturalHeight])).toEqual([1380, 1180])
    await expect.poll(() => obiPreview.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(537)
    source = (await preview.getAttribute('src'))!
  }
  const style = decodeURIComponent(source).match(/data-cd-cover="([^"]+)"/)![1]
  const discSource = (await discPreview.getAttribute('src'))!
  const backSource = (await backPreview.getAttribute('src'))!
  const obiSource = (await obiPreview.getAttribute('src'))!
  expect(decodeURIComponent(discSource)).toContain(`data-cd-disc="${style}"`)
  expect(decodeURIComponent(backSource)).toContain(`data-cd-back="${style}"`)
  expect(decodeURIComponent(obiSource)).toContain(`data-cd-obi="${style}"`)
  expect(discSource).not.toBe(source)
  expect(backSource).not.toBe(source)
  const color = decodeURIComponent(source).match(/<rect width="600" height="600" fill="([^"]+)"/)![1]
  const expectedColor = await preview.evaluate((_, value) => {
    const element = document.createElement('div')
    element.style.color = value
    return element.style.color
  }, color)
  await page.screenshot({ path: 'test-results/generated-cover-editor.png' })
  await page.getByRole('button', { name: 'Add recording', exact: true }).click()
  await expect(page.locator('.album-editor')).toHaveCount(0)
  await page.reload()
  await page.getByRole('button', { name: 'Open 夜の音 (Live) by 林 & Friends', exact: true }).click()
  await expect(page.locator('.viewer-controls')).toHaveCSS('opacity', '1')
  await expect(page.getByRole('img', { name: '夜の音 (Live) cover artwork' })).toHaveAttribute('src', source)
  await expect(page.locator('.case-spine')).toHaveCSS('background-color', expectedColor)
  await expect(page.locator('.case-rear')).toHaveCSS('background-color', expectedColor)
  await expect(page.locator('.obi-print-front')).toHaveCSS('background-image', `url("${obiSource}")`)
  await expect(page.locator('.tray-front .disc')).toHaveCSS('background-image', `url("${discSource}")`)
  await expect(page.locator('.case-rear img')).toHaveAttribute('src', backSource)
  await page.getByRole('button', { name: 'Edit recording', exact: true }).click()
  await expect(preview).toHaveAttribute('src', source)
  await page.getByRole('textbox', { name: 'Album title', exact: true }).fill('新しい音')
  const updated = (await preview.getAttribute('src'))!
  expect(decodeURIComponent(updated)).toContain(`data-cd-cover="${style}"`)
  expect(decodeURIComponent(updated)).toContain('新しい音')
  const updatedDisc = (await discPreview.getAttribute('src'))!
  const updatedBack = (await backPreview.getAttribute('src'))!
  const updatedObi = (await obiPreview.getAttribute('src'))!
  expect(decodeURIComponent(updatedDisc)).toContain('新しい音')
  expect(decodeURIComponent(updatedBack)).toContain('新しい音')
  expect(decodeURIComponent(updatedObi)).toContain('新しい音')
  await page.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(page.locator('.album-editor')).toHaveCount(0)
  await page.reload()
  await page.getByRole('button', { name: 'Open 新しい音 by 林 & Friends', exact: true }).click()
  await expect(page.getByRole('img', { name: '新しい音 cover artwork' })).toHaveAttribute('src', updated)
  await expect(page.locator('.tray-front .disc')).toHaveCSS('background-image', `url("${updatedDisc}")`)
  await expect(page.locator('.case-rear img')).toHaveAttribute('src', updatedBack)
  await expect(page.locator('.obi-print-front')).toHaveCSS('background-image', `url("${updatedObi}")`)
})

test('disc text stays inside its printable ring with long multilingual details and multiple discs', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.shelf-cd')).toHaveCount(24)
  await page.getByRole('button', { name: 'Add recording' }).click()
  await page.getByLabel('Number of discs').selectOption('6')
  await page.getByRole('combobox', { name: 'Choose a disc' }).selectOption('5')
  const preview = page.getByRole('img', { name: 'Disc preview', exact: true })
  const source = (await preview.getAttribute('src'))!
  expect(decodeURIComponent(source)).toContain('DISC 6 / 6')
  expect(decodeURIComponent((await page.getByRole('img', { name: 'Back cover preview', exact: true }).getAttribute('src'))!)).toContain('6 CDs')
  for (const [title, artist] of [
    ['夜の音 <Live> & 回声'.repeat(5), '林 & Friends (现场演奏)'.repeat(5)],
    ['W'.repeat(18), 'W'.repeat(30)],
  ]) {
    await page.getByRole('textbox', { name: 'Album title', exact: true }).fill(title)
    await page.getByRole('textbox', { name: 'Artist', exact: true }).fill(artist)
    const bounds = await preview.evaluate((image: HTMLImageElement) => {
      const documentSvg = new DOMParser().parseFromString(decodeURIComponent(image.src.split(',')[1]), 'image/svg+xml')
      const svg = document.importNode(documentSvg.documentElement, true)
      document.body.append(svg)
      try {
        return [...svg.querySelectorAll('text')].map((element) => {
          const box = element.getBBox()
          const corners = [box.x, box.x + box.width].flatMap((x) => [box.y, box.y + box.height].map((y) => Math.hypot(x, y - 300)))
          return { text: element.textContent, outer: Math.max(...corners), above: box.y + box.height < 234, below: box.y > 366 }
        })
      } finally {
        svg.remove()
      }
    })
    for (const bound of bounds) {
      expect(bound.outer, bound.text ?? '').toBeLessThan(265)
      expect(bound.above || bound.below, bound.text ?? '').toBe(true)
    }
  }
  await page.getByRole('button', { name: 'Disc 2', exact: true }).click()
  expect(decodeURIComponent((await preview.getAttribute('src'))!)).toContain('DISC 2 / 6')
  await page.getByLabel('Number of discs').selectOption('1')
  expect(decodeURIComponent((await preview.getAttribute('src'))!)).toContain('DISC 1 / 1')
  expect(decodeURIComponent((await page.getByRole('img', { name: 'Back cover preview', exact: true }).getAttribute('src'))!)).toContain('1 CD')
})

test('generated OBI fits every fold at standard case thickness for all disc counts on mobile', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.locator('.shelf-cd')).toHaveCount(24)
  await page.getByRole('button', { name: 'Add recording' }).click()
  await page.getByRole('checkbox', { name: 'Include OBI', exact: true }).check()
  await page.getByRole('textbox', { name: 'Album title', exact: true }).fill('夜の音 (Live)'.repeat(8))
  await page.getByRole('textbox', { name: 'Artist', exact: true }).fill('W'.repeat(30))
  const preview = page.getByRole('img', { name: 'OBI preview', exact: true })
  await expect(preview).toHaveCSS('object-fit', 'contain')
  for (const count of [1, 3, 4, 6]) {
    await page.getByLabel('Number of discs').selectOption(String(count))
    await expect.poll(() => preview.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(537)
    const bounds = await preview.evaluate((image: HTMLImageElement) => {
      const parsed = new DOMParser().parseFromString(decodeURIComponent(image.src.split(',')[1]), 'image/svg+xml')
      const svg = document.importNode(parsed.documentElement, true)
      document.body.append(svg)
      try {
        return [...svg.querySelectorAll<SVGGElement>('[data-obi-panel]')].flatMap((panel) => {
          const width = panel.querySelector('rect')!.width.baseVal.value
          return [...panel.querySelectorAll('text')].map((element) => {
            const box = element.getBBox()
            const matrix = panel.getCTM()!.inverse().multiply(element.getCTM()!)
            const corners = [box.x, box.x + box.width].flatMap((x) => [box.y, box.y + box.height].map((y) => new DOMPoint(x, y).matrixTransform(matrix)))
            return {
              text: element.textContent, width,
              left: Math.min(...corners.map((point) => point.x)), right: Math.max(...corners.map((point) => point.x)),
              top: Math.min(...corners.map((point) => point.y)), bottom: Math.max(...corners.map((point) => point.y)),
            }
          })
        })
      } finally {
        svg.remove()
      }
    })
    for (const bound of bounds) {
      expect(bound.left, bound.text ?? '').toBeGreaterThanOrEqual(0)
      expect(bound.right, bound.text ?? '').toBeLessThanOrEqual(bound.width)
      expect(bound.top, bound.text ?? '').toBeGreaterThanOrEqual(0)
      expect(bound.bottom, bound.text ?? '').toBeLessThanOrEqual(304)
    }
  }
  await page.locator('.obi-preview').screenshot({ path: 'test-results/generated-obi-mobile.png' })
  await page.getByRole('textbox', { name: 'Album title', exact: true }).fill('OBI Session')
  const source = (await preview.getAttribute('src'))!
  await page.getByRole('button', { name: 'Add recording', exact: true }).click()
  await expect(page.locator('.album-editor')).toHaveCount(0)
  await page.reload()
  await page.getByRole('button', { name: /^Open OBI Session by/ }).click()
  await page.getByRole('button', { name: 'Lay flat', exact: true }).click()
  const layout = await page.locator('.obi-strip').evaluate((element) => {
    const style = getComputedStyle(element)
    return { depth: Number.parseFloat(style.getPropertyValue('--obi-depth')), width: Number.parseFloat(style.getPropertyValue('--obi-width')) }
  })
  expect(layout.depth).toBeCloseTo(10.4 * 300 / 118, 5)
  expect(layout.width).toBeCloseTo((30 + 10.4 + 30) * 300 / 118, 4)
  for (const side of ['back', 'spine', 'front']) {
    await expect(page.locator(`.obi-print-${side}`)).toHaveCSS('background-image', `url("${source}")`)
    await expect(page.locator(`.obi-print-${side}`)).toHaveCSS('background-size', '178.983px 307.627px')
  }
  await expect(page.locator('.obi-print-back')).toHaveCSS('background-position', '0px 0px')
  await expect(page.locator('.obi-print-spine')).toHaveCSS('background-position', '-76.2712px 0px')
  await expect(page.locator('.obi-print-front')).toHaveCSS('background-position', '-102.712px 0px')
})

test('uploads replace individual artwork and randomizing preserves other uploaded images', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.locator('.shelf-cd')).toHaveCount(24)
  const image = await page.screenshot()
  await page.getByRole('button', { name: 'Add recording' }).click()
  await page.getByRole('textbox', { name: 'Album title', exact: true }).fill('My cover')
  await page.getByRole('textbox', { name: 'Artist', exact: true }).fill('Local Artist')
  for (const kind of ['cover artwork', 'back cover artwork', 'spine artwork', 'OBI paper strip']) {
    if (kind === 'OBI paper strip') await page.getByRole('checkbox', { name: 'Include OBI', exact: true }).check()
    await page.getByLabel(`Upload ${kind}`, { exact: true }).setInputFiles({ name: 'artwork.png', mimeType: 'image/png', buffer: image })
    await confirmCrop(page)
    await expect(page.getByRole('button', { name: 'Try another cover' })).toBeEnabled()
  }
  await expect(page.getByRole('img', { name: 'Cover preview', exact: true })).toHaveAttribute('src', /^data:image\/png/)
  await page.getByRole('button', { name: 'Try another cover' }).click()
  const source = (await page.getByRole('img', { name: 'Cover preview', exact: true }).getAttribute('src'))!
  expect(source).toMatch(/^data:image\/svg\+xml/)
  for (const name of ['Back cover preview', 'Spine preview', 'OBI preview']) {
    await expect(page.getByRole('img', { name, exact: true })).toHaveAttribute('src', /^data:image\/png/)
  }
  await page.screenshot({ path: 'test-results/generated-cover-mobile.png' })
  await page.getByRole('button', { name: 'Add recording', exact: true }).click()
  await expect(page.locator('.album-editor')).toHaveCount(0)
  await page.reload()
  await page.getByRole('button', { name: 'Open My cover by Local Artist', exact: true }).click()
  await expect(page.locator('.viewer-controls')).toHaveCSS('opacity', '1')
  await expect(page.getByRole('img', { name: 'My cover cover artwork' })).toHaveAttribute('src', source)
  await expect(page.locator('.case-spine img')).toHaveAttribute('src', /^data:image\/png/)
  await expect(page.locator('.case-rear img')).toHaveAttribute('src', /^data:image\/png/)
  await expect(page.locator('.obi-strip')).toHaveCSS('--obi-image', /data:image\/png/)
  await page.getByRole('button', { name: 'Edit recording', exact: true }).click()
  await page.getByLabel('Upload cover artwork', { exact: true }).setInputFiles({ name: 'cover.png', mimeType: 'image/png', buffer: image })
  await confirmCrop(page)
  await expect(page.getByRole('img', { name: 'Cover preview', exact: true })).toHaveAttribute('src', /^data:image\/png/)
  await page.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(page.locator('.album-editor')).toHaveCount(0)
  await page.reload()
  await page.getByRole('button', { name: 'Open My cover by Local Artist', exact: true }).click()
  await expect(page.getByRole('img', { name: 'My cover cover artwork' })).toHaveAttribute('src', /^data:image\/png/)
})

test('uploaded covers recolor generated packaging, keep custom images and preserve the palette after saving', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Add recording' }).click()
  await page.getByRole('textbox', { name: 'Album title', exact: true }).fill('Cover Colors')
  await page.getByRole('textbox', { name: 'Artist', exact: true }).fill('Local Artist')
  await page.getByRole('checkbox', { name: 'Include OBI', exact: true }).check()
  const names = ['Disc preview', 'Back cover preview', 'Booklet reverse preview', 'Back cover inside preview', 'Spine preview', 'Right spine preview', 'OBI preview']
  await page.getByLabel('Upload cover artwork', { exact: true }).setInputFiles(await coverFile(page, '#b43c2c'))
  await confirmCrop(page)
  await expect(page.getByRole('button', { name: 'Try another cover' })).toBeEnabled()
  const cover = (await page.getByRole('img', { name: 'Cover preview', exact: true }).getAttribute('src'))!
  const sources: string[] = []
  for (const name of names) {
    const preview = page.getByRole('img', { name, exact: true })
    const source = (await preview.getAttribute('src'))!
    sources.push(source)
    expect(decodeURIComponent(source)).toContain('fill="#b43c2c"')
    expect(decodeURIComponent(source)).toContain('fill="#ffffff"')
    await expect.poll(() => preview.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0)
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await page.locator('.editor-artwork').screenshot({ path: 'test-results/cover-palette-warm-mobile.png' })
  await page.getByRole('button', { name: 'Add recording', exact: true }).click()
  await expect(page.locator('.album-editor')).toHaveCount(0)
  await page.reload()
  await page.getByRole('button', { name: 'Open Cover Colors by Local Artist', exact: true }).click()
  await expect(page.getByRole('img', { name: 'Cover Colors cover artwork', exact: true })).toHaveAttribute('src', cover)
  await expect(page.locator('.case-spine')).toHaveCSS('background-color', 'rgb(180, 60, 44)')
  await expect(page.locator('.tray-front .disc')).toHaveCSS('background-image', `url("${sources[0]}")`)
  await page.getByRole('button', { name: 'Edit recording', exact: true }).click()
  for (const [index, name] of names.entries()) {
    await expect(page.getByRole('img', { name, exact: true })).toHaveAttribute('src', sources[index])
  }

  await page.getByLabel('Upload disc artwork', { exact: true }).setInputFiles(await coverFile(page, '#447788'))
  await confirmCrop(page)
  await expect(page.getByRole('button', { name: 'Try another cover' })).toBeEnabled()
  const disc = (await page.getByRole('img', { name: 'Disc preview', exact: true }).getAttribute('src'))!
  await page.getByLabel('Upload cover artwork', { exact: true }).setInputFiles(await coverFile(page, '#ede7df'))
  await confirmCrop(page)
  await expect(page.getByRole('button', { name: 'Try another cover' })).toBeEnabled()
  await page.getByRole('textbox', { name: 'Album title', exact: true }).fill('Pale Colors')
  for (const name of names.slice(1)) {
    const source = (await page.getByRole('img', { name, exact: true }).getAttribute('src'))!
    expect(decodeURIComponent(source)).toContain('fill="#ede7df"')
    expect(decodeURIComponent(source)).toContain('fill="#000000"')
    expect(decodeURIComponent(source)).toContain('Pale Colors')
  }
  await expect(page.getByRole('img', { name: 'Disc preview', exact: true })).toHaveAttribute('src', disc)
  await page.locator('.editor-artwork').screenshot({ path: 'test-results/cover-palette-pale-mobile.png' })
  await page.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(page.locator('.album-editor')).toHaveCount(0)
  await page.reload()
  await page.getByRole('button', { name: 'Open Pale Colors by Local Artist', exact: true }).click()
  await expect(page.locator('.case-spine')).toHaveCSS('background-color', 'rgb(237, 231, 223)')
  await expect(page.locator('.case-spine')).toHaveCSS('color', 'rgb(0, 0, 0)')
  await expect(page.locator('.tray-front .disc')).toHaveCSS('background-image', `url("${disc}")`)
})

test('importing a booklet takes its packaging palette from the front cover', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.getByRole('button', { name: 'Add recording' }).click()
  await page.getByRole('textbox', { name: 'Album title', exact: true }).fill('Blue Booklet')
  await page.getByRole('textbox', { name: 'Artist', exact: true }).fill('Local Artist')
  await page.getByLabel('Import entire booklet', { exact: true }).setInputFiles([
    await coverFile(page, '#244f86'),
    await coverFile(page, '#aa2244'),
  ])
  await confirmCrop(page, 2)
  await expect(page.getByRole('button', { name: 'Try another cover' })).toBeEnabled()
  const back = page.getByRole('img', { name: 'Back cover preview', exact: true })
  const source = (await back.getAttribute('src'))!
  expect(decodeURIComponent(source)).toContain('fill="#244f86"')
  await expect(page.getByRole('img', { name: 'Booklet reverse preview', exact: true })).toHaveAttribute('src', /^data:image\/png/)
  await page.getByRole('button', { name: 'Add recording', exact: true }).click()
  await expect(page.locator('.album-editor')).toHaveCount(0)
  await page.reload()
  await page.getByRole('button', { name: 'Open Blue Booklet by Local Artist', exact: true }).click()
  await expect(page.locator('.case-spine')).toHaveCSS('background-color', 'rgb(36, 79, 134)')
  await expect(page.locator('.case-rear img')).toHaveAttribute('src', source)
})

test('palette and theme choices preserve uploaded images, survive reload and can return to cover colors', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Add recording' }).click()
  await page.getByRole('textbox', { name: 'Album title', exact: true }).fill('Chosen Style')
  await page.getByRole('textbox', { name: 'Artist', exact: true }).fill('Local Artist')
  await page.getByRole('checkbox', { name: 'Include OBI', exact: true }).check()
  await page.getByLabel('Upload cover artwork', { exact: true }).setInputFiles(await coverFile(page, '#b43c2c'))
  await confirmCrop(page)
  await page.getByLabel('Upload disc artwork', { exact: true }).setInputFiles(await coverFile(page, '#447788'))
  await confirmCrop(page)
  const cover = page.getByRole('img', { name: 'Cover preview', exact: true })
  const disc = page.getByRole('img', { name: 'Disc preview', exact: true })
  const originalCover = (await cover.getAttribute('src'))!
  const originalDisc = (await disc.getAttribute('src'))!
  const back = page.getByRole('img', { name: 'Back cover preview', exact: true })
  const obi = page.getByRole('img', { name: 'OBI preview', exact: true })
  await expect(page.getByRole('group', { name: 'Color palette', exact: true }).getByRole('radio')).toHaveCount(10)
  await expect(page.getByRole('group', { name: 'Graphic theme', exact: true }).getByRole('radio')).toHaveCount(12)
  await page.getByRole('radio', { name: 'Cream paper', exact: true }).check()
  await page.getByRole('radio', { name: 'Flowing waves', exact: true }).check()
  expect(decodeURIComponent((await back.getAttribute('src'))!)).toContain('fill="#e8dfcc"')
  await page.getByRole('radio', { name: 'Forest green', exact: true }).check()
  await expect(page.getByRole('radio', { name: 'Flowing waves', exact: true })).toBeChecked()
  const previousBack = (await back.getAttribute('src'))!
  const previousObi = (await obi.getAttribute('src'))!
  await page.getByRole('radio', { name: 'Geometric collage', exact: true }).check()
  await expect(page.getByRole('radio', { name: 'Forest green', exact: true })).toBeChecked()
  await expect(back).not.toHaveAttribute('src', previousBack)
  await expect(obi).not.toHaveAttribute('src', previousObi)
  const savedBack = (await back.getAttribute('src'))!
  expect(decodeURIComponent(savedBack)).toContain('fill="#3e625a"')
  await expect(cover).toHaveAttribute('src', originalCover)
  await expect(disc).toHaveAttribute('src', originalDisc)
  await page.locator('.editor-design').screenshot({ path: 'test-results/artwork-style-choices-mobile.png' })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await page.getByRole('button', { name: 'Add recording', exact: true }).click()
  await expect(page.locator('.album-editor')).toHaveCount(0)
  await page.reload()
  await page.getByRole('button', { name: 'Open Chosen Style by Local Artist', exact: true }).click()
  await expect(page.locator('.case-spine')).toHaveCSS('background-color', 'rgb(62, 98, 90)')
  await expect(page.locator('.case-rear img')).toHaveAttribute('src', savedBack)
  await expect(page.locator('.tray-front .disc')).toHaveCSS('background-image', `url("${originalDisc}")`)
  await page.getByRole('button', { name: 'Edit recording', exact: true }).click()
  await expect(page.getByRole('radio', { name: 'Forest green', exact: true })).toBeChecked()
  await expect(page.getByRole('radio', { name: 'Geometric collage', exact: true })).toBeChecked()
  await expect(page.locator('.editor-footer > span')).toHaveText('Saved on this browser.')
  await page.getByRole('radio', { name: 'From cover', exact: true }).check()
  await expect(page.locator('.save-recording')).toBeEnabled()
  expect(decodeURIComponent((await back.getAttribute('src'))!)).toContain('fill="#b43c2c"')
  await expect(page.getByRole('radio', { name: 'Geometric collage', exact: true })).toBeChecked()
  await expect(cover).toHaveAttribute('src', originalCover)
  await expect(disc).toHaveAttribute('src', originalDisc)
  await page.getByLabel('Upload cover artwork', { exact: true }).setInputFiles(await coverFile(page, '#244f86'))
  await confirmCrop(page)
  expect(decodeURIComponent((await back.getAttribute('src'))!)).toContain('fill="#244f86"')
  await expect(page.getByRole('radio', { name: 'Geometric collage', exact: true })).toBeChecked()
  await page.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(page.locator('.album-editor')).toHaveCount(0)
  await page.reload()
  await page.getByRole('button', { name: 'Open Chosen Style by Local Artist', exact: true }).click()
  await expect(page.locator('.case-spine')).toHaveCSS('background-color', 'rgb(36, 79, 134)')
})

test('every theme and palette updates generated covers and keeps the chosen design after reopening', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.getByRole('button', { name: 'Add recording' }).click()
  await page.getByRole('textbox', { name: 'Album title', exact: true }).fill('Generated Choices')
  await page.getByRole('textbox', { name: 'Artist', exact: true }).fill('Local Artist')
  await page.getByRole('checkbox', { name: 'Include OBI', exact: true }).check()
  await page.getByRole('radio', { name: 'Cream paper', exact: true }).check()
  const names = ['Cover preview', 'Disc preview', 'Back cover preview', 'Booklet reverse preview', 'OBI preview']
  const variations = names.map(() => new Set<string>())
  for (const theme of ['Dusk arcs', 'Orbital rings', 'Architectural arches', 'Flowing waves', 'Geometric collage']) {
    await page.getByRole('radio', { name: theme, exact: true }).check()
    await expect(page.getByRole('radio', { name: 'Cream paper', exact: true })).toBeChecked()
    for (const [index, name] of names.entries()) {
      const preview = page.getByRole('img', { name, exact: true })
      const source = (await preview.getAttribute('src'))!
      expect(decodeURIComponent(source)).toContain('#e8dfcc')
      variations[index].add(source)
      await expect.poll(() => preview.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0)
    }
  }
  for (const variants of variations) expect(variants.size).toBe(5)
  for (const [palette, color] of [
    ['Warm terracotta', '#9a5546'], ['Forest green', '#3e625a'], ['Deep ocean', '#365c78'], ['Midnight violet', '#463c65'],
  ]) {
    await page.getByRole('radio', { name: palette, exact: true }).check()
    await expect(page.getByRole('radio', { name: 'Geometric collage', exact: true })).toBeChecked()
    expect(decodeURIComponent((await page.getByRole('img', { name: 'Cover preview', exact: true }).getAttribute('src'))!)).toContain(color)
  }
  const sources = await Promise.all(names.map((name) => page.getByRole('img', { name, exact: true }).getAttribute('src')))
  await page.locator('.editor-design').screenshot({ path: 'test-results/artwork-style-choices-desktop.png' })
  await page.getByRole('button', { name: 'Add recording', exact: true }).click()
  await expect(page.locator('.album-editor')).toHaveCount(0)
  await page.reload()
  await page.getByRole('button', { name: 'Open Generated Choices by Local Artist', exact: true }).click()
  await page.getByRole('button', { name: 'Edit recording', exact: true }).click()
  await expect(page.getByRole('radio', { name: 'Midnight violet', exact: true })).toBeChecked()
  await expect(page.getByRole('radio', { name: 'Geometric collage', exact: true })).toBeChecked()
  for (const [index, name] of names.entries()) {
    await expect(page.getByRole('img', { name, exact: true })).toHaveAttribute('src', sources[index]!)
  }
  await page.getByRole('textbox', { name: 'Album title', exact: true }).fill('Edited Choices')
  expect(decodeURIComponent((await page.getByRole('img', { name: 'Cover preview', exact: true }).getAttribute('src'))!)).toContain('Edited Choices')
  await page.getByRole('button', { name: 'Try another cover' }).click()
  await expect(page.getByRole('radio', { name: 'From cover', exact: true })).toBeChecked()
  await expect(page.getByRole('radio', { name: 'Automatic', exact: true })).toBeChecked()
  await expect(page.getByRole('img', { name: 'Cover preview', exact: true })).not.toHaveAttribute('src', sources[0]!)
})

test('changing only the theme preserves the existing generated colors after reopening', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.getByRole('button', { name: 'Add recording' }).click()
  await page.getByRole('textbox', { name: 'Album title', exact: true }).fill('Theme Only')
  await page.getByRole('textbox', { name: 'Artist', exact: true }).fill('Local Artist')
  const cover = page.getByRole('img', { name: 'Cover preview', exact: true })
  const initial = decodeURIComponent((await cover.getAttribute('src'))!)
  const theme = initial.includes('data-cd-cover="tiles"') ? 'Flowing waves' : 'Geometric collage'
  const color = initial.match(/<rect width="600" height="600" fill="([^"]+)"/)![1]
  await page.getByRole('radio', { name: theme, exact: true }).check()
  await expect(page.getByRole('radio', { name: 'From cover', exact: true })).toBeChecked()
  const source = (await cover.getAttribute('src'))!
  const disc = (await page.getByRole('img', { name: 'Disc preview', exact: true }).getAttribute('src'))!
  expect(decodeURIComponent(source)).toContain(`fill="${color}"`)
  await page.getByRole('button', { name: 'Add recording', exact: true }).click()
  await expect(page.locator('.album-editor')).toHaveCount(0)
  await page.reload()
  await page.getByRole('button', { name: 'Open Theme Only by Local Artist', exact: true }).click()
  await page.getByRole('button', { name: 'Edit recording', exact: true }).click()
  await expect(page.getByRole('radio', { name: theme, exact: true })).toBeChecked()
  await expect(cover).toHaveAttribute('src', source)
  await expect(page.getByRole('img', { name: 'Disc preview', exact: true })).toHaveAttribute('src', disc)
  await expect(page.locator('.editor-footer > span')).toHaveText('Saved on this browser.')
})
