import { test, expect } from '@playwright/test'
import { confirmCrop } from './helpers/artwork'

test('default covers can be changed, saved and edited without losing their design', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await expect(page.locator('.shelf-cd')).toHaveCount(24)
  await page.getByRole('button', { name: 'Add recording' }).click()
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
    await expect.poll(() => obiPreview.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(372)
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

test('generated OBI fits every fold and follows thicker cases on mobile', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.locator('.shelf-cd')).toHaveCount(24)
  await page.getByRole('button', { name: 'Add recording' }).click()
  await page.getByRole('textbox', { name: 'Album title', exact: true }).fill('夜の音 (Live)'.repeat(8))
  await page.getByRole('textbox', { name: 'Artist', exact: true }).fill('W'.repeat(30))
  const preview = page.getByRole('img', { name: 'OBI preview', exact: true })
  await expect(preview).toHaveCSS('object-fit', 'contain')
  for (const count of [1, 3, 4, 6]) {
    await page.getByLabel('Number of discs').selectOption(String(count))
    await expect.poll(() => preview.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(count > 3 ? 474 : 372)
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
  await expect(page.locator('.obi-strip')).toHaveCSS('--obi-depth', '66px')
  await expect(page.locator('.obi-strip')).toHaveCSS('--obi-width', '158px')
  for (const side of ['back', 'spine', 'front']) {
    await expect(page.locator(`.obi-print-${side}`)).toHaveCSS('background-image', `url("${source}")`)
    await expect(page.locator(`.obi-print-${side}`)).toHaveCSS('background-size', '158px 304px')
  }
  await expect(page.locator('.obi-print-back')).toHaveCSS('background-position', '0px 0px')
  await expect(page.locator('.obi-print-spine')).toHaveCSS('background-position', '-46px 0px')
  await expect(page.locator('.obi-print-front')).toHaveCSS('background-position', '-112px 0px')
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
