import { test, expect } from '@playwright/test'

test('opens the case, reverses it, restores focus and the original slot', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await page.evaluate(() => document.fonts.ready)
  const spine = page.getByRole('button', {
    name: 'Open Blue Hours by The Paper Kites',
    exact: true,
  })
  const before = await spine.locator('..').boundingBox()
  await page.screenshot({
    path: 'test-results/cabinet-desktop.png',
    fullPage: true,
  })
  await spine.click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(spine).toBeHidden()
  await expect
    .poll(() =>
      page
        .locator('.case-lid')
        .evaluate((el) => getComputedStyle(el).transform),
    )
    .toContain('-0.965')
  await expect(
    page.getByRole('heading', { name: 'Blue Hours', exact: true }),
  ).toBeVisible()
  await page.screenshot({ path: 'test-results/album-open.png' })
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(spine).toBeVisible()
  await expect(spine).toBeFocused()
  await page.mouse.move(0, 0)
  await expect
    .poll(async () => (await spine.locator('..').boundingBox())!.y)
    .toBeCloseTo(before!.y, 0)
  expect((await spine.locator('..').boundingBox())!.x).toBeCloseTo(before!.x, 0)
  expect(errors).toEqual([])
})

test('search, filtering and keyboard sorting work', async ({ page }) => {
  await page.goto('/')
  await page
    .getByRole('textbox', { name: 'Search albums and artists' })
    .fill('Hana')
  await expect(page.locator('.shelf-cd')).toHaveCount(1)
  await page.getByRole('textbox').fill('')
  await page.getByRole('button', { name: 'Jazz', exact: true }).click()
  await expect(page.locator('.shelf-cd')).toHaveCount(6)
  await page.getByRole('button', { name: 'Edit shelf', exact: true }).click()
  await expect(page.locator('.shelf-cd')).toHaveCount(24)
  const first = page.getByRole('button', {
    name: 'Reorder Blue Hours by The Paper Kites',
    exact: true,
  })
  await first.focus()
  const initialPosition = await first.locator('..').boundingBox()
  await page.keyboard.press('Space')
  await expect(first.locator('..')).toHaveClass(/is-dragging/)
  await page.evaluate(
    () => new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    }),
  )
  await page.keyboard.press('ArrowRight')
  await expect
    .poll(async () => (await first.locator('..').boundingBox())!.x)
    .toBeGreaterThan(initialPosition!.x + initialPosition!.width / 2)
  await page.keyboard.press('Space')
  await expect(page.locator('.shelf-cd').nth(1)).toHaveAttribute(
    'data-album-id',
    'album-1',
  )
  await page.getByRole('button', { name: 'Done arranging' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('pointer dragging moves a recording into the target slot', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => document.fonts.ready)
  await page.getByRole('button', { name: 'Edit shelf', exact: true }).click()
  const source = page.locator('[data-album-id="album-2"]')
  const target = page.locator('[data-album-id="album-5"]')
  const from = (await source.locator('..').boundingBox())!
  const to = (await target.locator('..').boundingBox())!
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(from.x + from.width / 2 + 10, from.y + from.height / 2)
  await expect(source.locator('..')).toHaveClass(/is-dragging/)
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 })
  await page.mouse.up()
  await expect(page.locator('.shelf-cd').nth(4)).toHaveAttribute('data-album-id', 'album-2')
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('a mobile album returns to its slot after scrolling the cabinet', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.evaluate(() => document.fonts.ready)
  const spine = page.locator('[data-album-id="album-24"]')
  await spine.scrollIntoViewIfNeeded()
  const before = (await spine.locator('..').boundingBox())!
  await spine.click()
  await expect(page.locator('.viewer-controls')).toHaveCSS('opacity', '1')
  await expect.poll(() => page.locator('.case-lid').evaluate((el) => getComputedStyle(el).transform)).toContain('-0.965')
  await page.screenshot({ path: 'test-results/album-mobile-animated.png' })
  expect((await page.locator('.lid-inside').boundingBox())!.x).toBeGreaterThanOrEqual(0)
  const tray = (await page.locator('.disc-tray').boundingBox())!
  expect(tray.x + tray.width).toBeLessThanOrEqual(390)
  await page.getByRole('button', { name: 'Close album' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect.poll(async () => (await spine.locator('..').boundingBox())!.y).toBeCloseTo(before.y, 0)
  await expect(spine).toBeFocused()
})

test('mobile and reduced motion remain usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  )
  await page.screenshot({
    path: 'test-results/cabinet-mobile.png',
    fullPage: true,
  })
  await page
    .getByRole('button', { name: 'Open Moonflower by Hana', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Moonflower', exact: true }),
  ).toBeVisible()
  await expect(page.locator('.case-lid')).toHaveCSS('transform', /matrix3d/)
  await expect(page.locator('.viewer-controls')).toHaveCSS('opacity', '1')
  await page.screenshot({ path: 'test-results/album-mobile.png' })
  await page.getByRole('button', { name: 'Close album' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('small phones and tablets have no horizontal overflow', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => document.fonts.ready)
  for (const width of [320, 700, 768]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
  }
})

test('background dismissal and early close finish the return animation', async ({
  page,
}) => {
  await page.goto('/')
  await page
    .getByRole('button', {
      name: 'Open Blue Hours by The Paper Kites',
      exact: true,
    })
    .click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page
    .getByRole('button', { name: 'Open Moonflower by Hana', exact: true })
    .click()
  await expect(page.locator('.viewer-controls')).toHaveCSS('opacity', '1')
  await page
    .locator('.collection-overlay')
    .click({ position: { x: 20, y: 150 } })
  await expect(page.getByRole('dialog')).toHaveCount(0)
})
