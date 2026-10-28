import { test, expect, type Page } from '@playwright/test'
import { confirmCrop } from './helpers/artwork'

async function pages(page: Page, count: number) {
  const files = []
  for (let index = 0; index < count; index += 1) {
    const data = await page.evaluate((hue) => {
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 240
      const context = canvas.getContext('2d')!
      context.fillStyle = `hsl(${hue} 55% 60%)`
      context.fillRect(0, 0, 240, 240)
      return canvas.toDataURL('image/png')
    }, index * 40)
    files.push({ name: `Inner ${index + 1}.png`, mimeType: 'image/png', buffer: Buffer.from(data.split(',')[1], 'base64') })
  }
  return files
}

async function openReader(page: Page, title: string) {
  await page.getByRole('button', { name: `Open ${title} by Booklet Artist`, exact: true }).click()
  await expect(page.locator('.viewer-controls')).toHaveCSS('opacity', '1')
  await page.getByRole('button', { name: 'Read booklet', exact: true }).click()
}

const visibleImages = (page: Page) => page.locator('.reader-paper:not([aria-hidden="true"]) img')

test('a bound booklet opens into stapled spreads, pads a blank page and turns like a book', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add recording' }).click()
  await page.getByRole('textbox', { name: 'Album title', exact: true }).fill('Bound Pages')
  await page.getByRole('textbox', { name: 'Artist', exact: true }).fill('Booklet Artist')
  await expect(page.getByRole('radio', { name: /Bound booklet/ })).toBeChecked()
  await page.getByLabel('Upload booklet pages', { exact: true }).setInputFiles(await pages(page, 3))
  await confirmCrop(page, 3)
  await expect(page.locator('.booklet-page-count')).toHaveText('5 pages including the front and back covers')
  await expect(page.getByText('a blank inside back cover is added', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'Add recording', exact: true }).click()
  await expect(page.locator('.album-editor')).toHaveCount(0)

  await openReader(page, 'Bound Pages')
  const reader = page.locator('.artwork-reader')
  const book = page.locator('.booklet-book')
  const next = page.getByRole('button', { name: 'Next page', exact: true })
  const previous = page.getByRole('button', { name: 'Previous page', exact: true })
  // 5 页内容 + 1 张空白封三 = 3 张纸。
  await expect(page.locator('.booklet-leaf')).toHaveCount(3)
  await expect(page.locator('.reader-blank')).toHaveCount(1)
  await expect(visibleImages(page)).toHaveCount(1)
  await expect(book).not.toHaveClass(/is-open/)
  await expect(previous).toBeDisabled()

  await next.click()
  await expect(book).toHaveClass(/is-open/)
  await expect(visibleImages(page)).toHaveCount(2)
  await expect(reader.locator('nav small')).toHaveText('2–3 / 5')
  await expect.poll(() => page.locator('.booklet-leaf').first().evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).m11)).toBeCloseTo(-1, 2)
  await page.screenshot({ path: 'test-results/booklet-spread.png' })

  await page.keyboard.press('ArrowRight')
  await expect(reader.locator('nav small')).toHaveText('4 / 5')
  await expect(page.locator('.reader-blank')).not.toHaveAttribute('aria-hidden', 'false')
  await expect(visibleImages(page)).toHaveCount(1)
  await page.keyboard.press('ArrowRight')
  await expect(reader.locator('nav small')).toHaveText('5 / 5')
  await expect(book).not.toHaveClass(/is-open/)
  await expect(next).toBeDisabled()

  await page.getByRole('button', { name: 'Go to booklet page 3', exact: true }).click()
  await expect(reader.locator('nav small')).toHaveText('2–3 / 5')
  await expect(page.getByRole('button', { name: 'Go to booklet page 3', exact: true })).toHaveAttribute('aria-current', 'page')
  await page.keyboard.press('ArrowLeft')
  await expect(reader.locator('nav small')).toHaveText('1 / 5')
  await expect(previous).toBeDisabled()
  await page.keyboard.press('Escape')
  await expect(reader).toHaveCount(0)
})

test('a single-sheet insert keeps its inner pages, flips between both sides and survives reload', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.getByRole('button', { name: 'Add recording' }).click()
  await page.getByRole('textbox', { name: 'Album title', exact: true }).fill('Single Card')
  await page.getByRole('textbox', { name: 'Artist', exact: true }).fill('Booklet Artist')
  await page.getByLabel('Upload booklet pages', { exact: true }).setInputFiles(await pages(page, 2))
  await confirmCrop(page, 2)
  await page.getByRole('radio', { name: /Single sheet/ }).check()
  await expect(page.getByText('Inner pages are kept but hidden while the insert is a single sheet.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Upload booklet pages' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Add recording', exact: true }).click()
  await expect(page.locator('.album-editor')).toHaveCount(0)
  await page.reload()

  await openReader(page, 'Single Card')
  await expect(page.getByRole('heading', { name: 'Single-sheet insert', exact: true })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Booklet page thumbnails', exact: true }).getByRole('button')).toHaveCount(2)
  const sheet = page.locator('.booklet-sheet')
  await expect(sheet).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)')
  await page.getByRole('button', { name: 'Back side', exact: true }).click()
  await expect(page.locator('.reader-paper.is-current img')).toHaveAttribute('alt', 'Back side')
  await expect.poll(() => sheet.evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).m11)).toBeCloseTo(-1, 2)
  await expect(page.getByRole('button', { name: 'Back side', exact: true })).toBeDisabled()
  await page.keyboard.press('ArrowLeft')
  await expect(page.locator('.reader-paper.is-current img')).toHaveAttribute('alt', 'Front side')
  await page.keyboard.press('Escape')

  await page.getByRole('button', { name: 'Edit recording', exact: true }).click()
  await expect(page.getByRole('radio', { name: /Single sheet/ })).toBeChecked()
  await page.getByRole('radio', { name: /Bound booklet/ }).check()
  await expect(page.getByRole('combobox', { name: 'Choose an inner page to edit', exact: true }).locator('option')).toHaveCount(2)
})
