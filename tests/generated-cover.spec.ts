import { test, expect } from '@playwright/test'

test('default covers can be changed, saved and edited without losing their design', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await expect(page.locator('.shelf-cd')).toHaveCount(24)
  await page.getByRole('button', { name: 'Add recording' }).click()
  const preview = page.getByRole('img', { name: 'Cover preview' })
  await expect(preview).toHaveAttribute('src', /^data:image\/svg\+xml/)
  await page.getByRole('textbox', { name: 'Album title', exact: true }).fill('夜の音 (Live)')
  await page.getByRole('textbox', { name: 'Artist', exact: true }).fill('林 & Friends')
  let source = (await preview.getAttribute('src'))!
  expect(decodeURIComponent(source)).toContain('夜の音 (Live)')
  expect(decodeURIComponent(source)).toContain('林 &amp; Friends')
  for (let index = 0; index < 5; index++) {
    await page.getByRole('button', { name: 'Try another cover' }).click()
    await expect(preview).not.toHaveAttribute('src', source)
    await expect.poll(() => preview.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(1000)
    source = (await preview.getAttribute('src'))!
  }
  const style = decodeURIComponent(source).match(/data-cd-cover="([^"]+)"/)![1]
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
  await expect(page.locator('.obi-strip')).toHaveCSS('--obi-ink', color)
  await expect(page.locator('.tray-front .disc')).toHaveCSS('background-image', /data:image\/svg\+xml/)
  await page.getByRole('button', { name: 'Edit recording', exact: true }).click()
  await expect(preview).toHaveAttribute('src', source)
  await page.getByRole('textbox', { name: 'Album title', exact: true }).fill('新しい音')
  const updated = (await preview.getAttribute('src'))!
  expect(decodeURIComponent(updated)).toContain(`data-cd-cover="${style}"`)
  expect(decodeURIComponent(updated)).toContain('新しい音')
  await page.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(page.locator('.album-editor')).toHaveCount(0)
  await page.reload()
  await page.getByRole('button', { name: 'Open 新しい音 by 林 & Friends', exact: true }).click()
  await expect(page.getByRole('img', { name: '新しい音 cover artwork' })).toHaveAttribute('src', updated)
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
  await expect(page.getByRole('img', { name: 'Cover preview', exact: true })).toHaveAttribute('src', /^data:image\/png/)
  await page.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(page.locator('.album-editor')).toHaveCount(0)
  await page.reload()
  await page.getByRole('button', { name: 'Open My cover by Local Artist', exact: true }).click()
  await expect(page.getByRole('img', { name: 'My cover cover artwork' })).toHaveAttribute('src', /^data:image\/png/)
})
