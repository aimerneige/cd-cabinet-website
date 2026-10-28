import { test, expect } from '@playwright/test'
import { confirmCrop, discardEditor, dismissArtworkAlert } from './helpers/artwork'

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

for (const reducedMotion of ['reduce', 'no-preference'] as const) {
  test(`the lid closes and reopens the case without returning it with ${reducedMotion} motion`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion })
    if (reducedMotion === 'reduce') await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    const source = page.locator('[data-album-id="album-3"]')
    await source.click()
    const lid = page.locator('.case-lid')
    await expect(lid).toBeEnabled()
    await page.locator('.lid-inside').click()
    await expect(page.getByRole('button', { name: 'Front', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(source).toBeHidden()
    await expect(page.getByRole('button', { name: 'Open case', exact: true })).toBeEnabled()
    await page.getByRole('button', { name: 'Attached', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Attached', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await page.locator('.lid-front').click()
    await expect(page.getByRole('button', { name: 'Inside', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('.obi-strip')).toHaveCSS('visibility', 'hidden')
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('button', { name: 'Disc 2', exact: true }).click()
    await expect(page.locator('.selected-disc-label')).toHaveText('DISC 2 / 2')
    const spread = await page.locator('.tray-leaf').evaluate((element) => getComputedStyle(element).transform)
    await lid.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('button', { name: 'Front', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('button', { name: 'Open case', exact: true })).toBeFocused()
    await page.keyboard.press('Space')
    await expect(page.getByRole('button', { name: 'Inside', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('button', { name: 'Close case', exact: true })).toBeFocused()
    await expect(page.locator('.selected-disc-label')).toHaveText('DISC 2 / 2')
    await expect(page.locator('.tray-leaf')).toHaveCSS('transform', spread)
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(source).toBeFocused()
  })
}

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
  await expect(
    page.getByText('Saved in this browser.', { exact: true }),
  ).toBeVisible()
  await page.reload()
  await expect(page.locator('.shelf-cd').nth(1)).toHaveAttribute(
    'data-album-id',
    'album-1',
  )
})

test('standard double cases flip their tray and each disc has its own track list', async ({
  page,
}) => {
  await page.goto('/')
  const single = page.locator('[data-album-id="album-1"]')
  const double = page.locator('[data-album-id="album-3"]')
  await expect(double).toBeVisible()
  expect((await double.locator('..').boundingBox())!.width).toBeCloseTo(
    (await single.locator('..').boundingBox())!.width,
  )
  await double.click()
  await expect(page.locator('.viewer-controls')).toHaveCSS('opacity', '1')
  await expect(page.locator('.album-meta')).toContainText('2 CDs')
  await expect(page.locator('.track-list')).toContainText('An Introduction')
  await page.getByRole('button', { name: 'Close album' }).focus()
  await page.keyboard.press('Tab')
  await expect(
    page.getByRole('button', { name: 'Play disc 1 from the beginning' }),
  ).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Close case', exact: true })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(
    page.getByRole('button', { name: 'Disc 1', exact: true }),
  ).toBeFocused()
  await page.getByRole('button', { name: 'Disc 2', exact: true }).click()
  await expect(page.locator('.track-list')).toHaveAttribute('aria-busy', 'true')
  await expect(page.locator('.track-list')).toContainText('An Introduction')
  await expect(page.locator('.track-list')).toContainText('The Space Between')
  await expect(page.locator('.track-list')).not.toContainText('An Introduction')
  await expect(page.locator('.selected-disc-label')).toHaveText('DISC 2 / 2')
  await expect(page.locator('.tray-leaf')).toHaveCSS('transform', /matrix3d/)
  await page.screenshot({ path: 'test-results/disc-tray-flipped.png' })
  await page.getByRole('button', { name: 'Disc 1', exact: true }).click()
  await expect(page.locator('.track-list')).toContainText('An Introduction')
  await page.getByRole('button', { name: 'Close album' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('three-disc trays reveal the base disc and can close during a turn', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.locator('[data-album-id="album-18"]').click()
  await expect(page.locator('.viewer-controls')).toHaveCSS('opacity', '1')
  await expect(page.locator('.tray-disc-label')).toHaveCount(0)
  await expect(page.locator('.tray-base .disc')).toHaveCount(1)
  await page.getByRole('button', { name: 'Disc 3', exact: true }).click()
  await expect(page.locator('.selected-disc-label')).toHaveText('DISC 3 / 3')
  await expect(page.getByRole('button', { name: 'Disc 3', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.screenshot({ path: 'test-results/triple-disc-mobile.png' })
  const tray = (await page.locator('.tray-back').boundingBox())!
  expect(tray.x).toBeGreaterThanOrEqual(0)
  expect(tray.x + tray.width).toBeLessThanOrEqual(390)
  const openTransform = await page.locator('.tray-leaf').evaluate((el) => getComputedStyle(el).transform)
  await page.getByRole('button', { name: 'Disc 2', exact: true }).click()
  await expect(page.locator('.selected-disc-label')).toHaveText('DISC 2 / 3')
  await expect(page.locator('.track-list')).toHaveAttribute('aria-busy', 'false')
  await expect(page.locator('.track-list')).toContainText('The Space Between')
  await expect(page.locator('.tray-leaf')).toHaveCSS('transform', openTransform)
  await page.getByRole('button', { name: 'Disc 3', exact: true }).click()
  await expect(page.locator('.selected-disc-label')).toHaveText('DISC 3 / 3')
  await expect(page.locator('.track-list')).toHaveAttribute('aria-busy', 'false')
  await expect(page.locator('.track-list')).toContainText('A Little Further')
  await expect(page.locator('.tray-leaf')).toHaveCSS('transform', openTransform)
  await page.getByRole('button', { name: 'Disc 1', exact: true }).click()
  await expect(page.locator('.track-list')).toHaveAttribute('aria-busy', 'true')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('[data-album-id="album-18"]')).toBeFocused()
})

for (const count of [4, 5, 6]) {
  test(`${count}-disc sets keep fixed trays and turn every page in both directions`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    if (count > 4) await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await page.locator('[data-album-id="album-1"]').click()
    await expect(page.locator('.viewer-controls')).toHaveCSS('opacity', '1')
    await page.getByRole('button', { name: 'Edit recording', exact: true }).click()
    await expect(page.locator('.album-editor')).toBeVisible()
    await page.getByLabel('Number of discs').selectOption(String(count))
    await page.getByRole('button', { name: 'Save changes', exact: true }).click()
    await expect(page.locator('.album-editor')).toHaveCount(0)
    await page.locator('[data-album-id="album-1"]').click()
    await expect(page.locator('.viewer-controls')).toHaveCSS('opacity', '1')
    await expect(page.locator('.tray-leaf')).toHaveCount(Math.floor(count / 2))
    await expect(page.locator('.cd-case [data-disc-id]')).toHaveCount(count)
    const discIds = await page.locator('.cd-case [data-disc-id]').evaluateAll((elements) =>
      elements.map((element) => element.getAttribute('data-disc-id')),
    )
    const transforms = () => page.locator('.tray-leaf').evaluateAll((elements) =>
      elements.map((element) => getComputedStyle(element).transform),
    )
    const selectDisc = async (number: number) => {
      await page.getByRole('button', { name: `Disc ${number}`, exact: true }).click()
      await expect(page.locator('.selected-disc-label')).toHaveText(`DISC ${number} / ${count}`)
      await expect(page.locator('.track-list')).toHaveAttribute('aria-busy', 'false')
      const disc = page.getByRole('button', { name: `Play disc ${number} from the beginning`, exact: true })
      await expect(disc).toHaveCount(1)
      const visibleDiscs = await disc.evaluate((element) => {
        const rect = element.getBoundingClientRect()
        return [0.2, 0.5, 0.8].map((x) =>
          document.elementFromPoint(rect.x + rect.width * x, rect.y + rect.height * 0.5)
            ?.closest('[data-disc-id]')?.getAttribute('data-disc-id'),
        )
      })
      expect(visibleDiscs).toEqual(Array(3).fill(await disc.getAttribute('data-disc-id')))
      if (count > 4) {
        const rect = (await disc.boundingBox())!
        expect(rect.x).toBeGreaterThanOrEqual(0)
        expect(rect.x + rect.width).toBeLessThanOrEqual(390)
      }
      expect(await page.locator('.cd-case [data-disc-id]').evaluateAll((elements) =>
        elements.map((element) => element.getAttribute('data-disc-id')),
      )).toEqual(discIds)
    }
    await selectDisc(1)
    for (let number = 2; number <= count; number++) {
      const before = await transforms()
      await selectDisc(number)
      if (number % 2 === 1) expect(await transforms()).toEqual(before)
      else expect(await transforms()).not.toEqual(before)
    }
    await page.screenshot({ path: `test-results/${count}-disc-last-page.png` })
    for (let number = count - 1; number >= 1; number--) await selectDisc(number)
    const closed = await transforms()
    const turnFrames = count === 6 ? page.evaluate(async () => {
      const frames: number[][] = []
      while (document.querySelector('.selected-disc-label')?.textContent !== 'DISC 6 / 6') {
        frames.push([...document.querySelectorAll('.tray-leaf')].map((element) =>
          new DOMMatrix(getComputedStyle(element).transform).m11,
        ))
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
      }
      return frames
    }) : null
    await selectDisc(count)
    if (turnFrames) {
      const frames = await turnFrames
      for (let index = 0; index < 3; index++) {
        expect(frames.some((frame) => frame[index] < 0.99 && frame[index] > -0.85)).toBe(true)
        if (index > 0) expect(frames.every((frame) => frame[index] >= 0.99 || frame[index - 1] < -0.86)).toBe(true)
      }
    }
    const opened = await transforms()
    await page.getByRole('button', { name: 'Back', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Back', exact: true })).toHaveAttribute('aria-pressed', 'true')
    expect(await transforms()).toEqual(opened)
    await page.getByRole('button', { name: 'Front', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Front', exact: true })).toHaveAttribute('aria-pressed', 'true')
    const lidDepth = await page.locator('.case-lid').evaluate((element) =>
      new DOMMatrix(getComputedStyle(element).transform).m43,
    )
    const foldedTrays = await page.locator('.tray-leaf').evaluateAll((elements) =>
      elements.map((element) => {
        const transform = new DOMMatrix(getComputedStyle(element).transform)
        return { facingFront: transform.m11 === 1, depth: transform.m43 }
      }),
    )
    expect(foldedTrays.every((tray) => tray.facingFront && tray.depth < lidDepth)).toBe(true)
    await page.screenshot({ path: `test-results/${count}-disc-front.png` })
    await page.getByRole('button', { name: 'Inside', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Inside', exact: true })).toHaveAttribute('aria-pressed', 'true')
    expect(await transforms()).toEqual(opened)
    await selectDisc(count)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await selectDisc(1)
    expect(await transforms()).toEqual(closed)
    await selectDisc(count)
    expect(await transforms()).toEqual(opened)
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.getByRole('button', { name: 'Disc 1', exact: true }).click()
    await expect(page.locator('.track-list')).toHaveAttribute('aria-busy', 'true')
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.locator('[data-album-id="album-1"]')).toBeFocused()
    expect(errors).toEqual([])
  })
}

test('uploaded artwork, multi-disc additions and edits survive a reload', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.locator('.shelf-cd')).toHaveCount(24)
  const image = await page.screenshot()
  await page.getByRole('button', { name: 'Add recording' }).click()
  await page
    .getByRole('textbox', { name: 'Album title', exact: true })
    .fill('Uploaded Session')
  await page
    .getByRole('textbox', { name: 'Artist', exact: true })
    .fill('Local Artist')
  await page
    .getByRole('combobox', { name: 'Number of discs' })
    .selectOption('2')
  await page
    .getByLabel('Upload cover artwork')
    .setInputFiles({ name: 'cover.png', mimeType: 'image/png', buffer: image })
  await confirmCrop(page)
  await expect(
    page.getByRole('img', { name: 'Cover preview', exact: true }),
  ).toHaveAttribute('src', /^data:image\/png/)
  await page
    .getByLabel('Upload spine artwork')
    .setInputFiles({ name: 'spine.png', mimeType: 'image/png', buffer: image })
  await confirmCrop(page)
  await expect(
    page.getByRole('img', { name: 'Spine preview', exact: true }),
  ).toHaveAttribute('src', /^data:image\/png/)
  await page.getByLabel('Upload back cover artwork').setInputFiles({ name: 'back.png', mimeType: 'image/png', buffer: image })
  await confirmCrop(page)
  await expect(page.getByRole('img', { name: 'Back cover preview' })).toHaveAttribute('src', /^data:image\/png/)
  await page.getByRole('button', { name: 'Add recording', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('.shelf-cd')).toHaveCount(25)
  await page.reload()
  const added = page.getByRole('button', {
    name: 'Open Uploaded Session by Local Artist',
    exact: true,
  })
  await expect(added).toBeVisible()
  await expect(added.locator('img')).toHaveAttribute('src', /^data:image\/png/)
  await added.click()
  await expect(page.locator('.viewer-controls')).toHaveCSS('opacity', '1')
  await expect(
    page.getByRole('img', { name: 'Uploaded Session cover artwork' }),
  ).toHaveAttribute('src', /^data:image\/png/)
  await expect(page.locator('.case-spine img')).toHaveAttribute(
    'src',
    /^data:image\/png/,
  )
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Back', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('img', { name: 'Uploaded Session back cover artwork' })).toHaveAttribute('src', /^data:image\/png/)
  await page.getByRole('button', { name: 'Inside', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Inside', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Disc 2', exact: true }).click()
  await expect(page.locator('.empty-tracks')).toBeVisible()
  await page
    .getByRole('button', { name: 'Edit recording', exact: true })
    .click()
  await expect(
    page.getByRole('main', { name: 'Edit recording', exact: true }),
  ).toBeVisible()
  await page
    .getByRole('textbox', { name: 'Album title', exact: true })
    .fill('Updated Session')
  await page
    .getByRole('combobox', { name: 'Number of discs' })
    .selectOption('3')
  await page.getByRole('button', { name: 'Use generated spine' }).click()
  await page.getByRole('button', { name: 'Use generated back cover' }).click()
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.reload()
  const updated = page.getByRole('button', {
    name: 'Open Updated Session by Local Artist',
    exact: true,
  })
  await expect(updated).toBeVisible()
  await expect(updated.locator('img')).toHaveCount(0)
  await updated.click()
  await expect(page.locator('.viewer-controls')).toHaveCSS('opacity', '1')
  await expect(page.locator('.album-meta')).toContainText('3 CDs')
  await expect(page.locator('.case-rear img')).toHaveAttribute('src', /^data:image\/svg\+xml/)
  expect(decodeURIComponent((await page.locator('.case-rear img').getAttribute('src'))!)).toContain('Updated Session')
  await page.screenshot({ path: 'test-results/multi-disc-uploaded.png' })
})

test('back view flips the whole case while preserving the lid and disc tray', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => document.fonts.ready)
  const source = page.locator('[data-album-id="album-18"]')
  await source.scrollIntoViewIfNeeded()
  const origin = (await source.locator('..').boundingBox())!
  await source.click()
  await expect(page.locator('.viewer-controls')).toHaveCSS('opacity', '1')
  await page.getByRole('button', { name: 'Disc 2', exact: true }).click()
  await expect(page.locator('.selected-disc-label')).toHaveText('DISC 2 / 3')
  const lid = await page.locator('.case-lid').evaluate((el) => getComputedStyle(el).transform)
  const tray = await page.locator('.tray-leaf').evaluate((el) => getComputedStyle(el).transform)
  const motion = page.evaluate(async () => {
    const angles: string[] = []
    while (document.querySelector('.case-view-selector button:last-child')?.getAttribute('aria-pressed') !== 'true') {
      angles.push(getComputedStyle(document.querySelector('.case-lid')!).transform)
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    }
    return angles
  })
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Back', exact: true })).toHaveAttribute('aria-pressed', 'true')
  expect((await motion).every((angle) => angle === lid)).toBe(true)
  await expect(page.locator('.case-lid')).toHaveCSS('transform', lid)
  await expect(page.locator('.tray-leaf')).toHaveCSS('transform', tray)
  await expect(page.locator('.case-body')).toHaveCSS('transform', /matrix3d/)
  await page.screenshot({ path: 'test-results/case-back-open.png' })
  await page.getByRole('button', { name: 'Inside', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Inside', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.tray-leaf')).toHaveCSS('transform', tray)
  await page.getByRole('button', { name: 'Front', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Front', exact: true })).toHaveAttribute('aria-pressed', 'true')
  const closedLid = await page.locator('.case-lid').evaluate((el) => getComputedStyle(el).transform)
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Back', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.case-lid')).toHaveCSS('transform', closedLid)
  await page.screenshot({ path: 'test-results/case-back-closed.png' })
  await page.getByRole('button', { name: 'Close album' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(source).toBeFocused()
  const returned = (await source.locator('..').boundingBox())!
  expect(returned.x).toBeCloseTo(origin.x, 0)
  expect(returned.y).toBeCloseTo(origin.y, 0)
})

test('back view fits a phone, supports reduced motion and closes during a flip', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.locator('[data-album-id="album-1"]').click()
  await expect(page.locator('.viewer-controls')).toHaveCSS('opacity', '1')
  const lid = await page.locator('.case-lid').evaluate((el) => getComputedStyle(el).transform)
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Back', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.case-lid')).toHaveCSS('transform', lid)
  for (const surface of ['.case-rear', '.lid-front']) {
    const box = (await page.locator(surface).boundingBox())!
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(390)
  }
  await page.screenshot({ path: 'test-results/case-back-mobile.png' })
  await page.getByRole('button', { name: 'Inside', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Inside', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('[data-album-id="album-1"]')).toBeFocused()
})

test('OBI paper folds detach, flatten, hide and attach on both sides of the case', async ({ page }) => {
  await page.goto('/')
  await page.locator('[data-album-id="album-3"]').click()
  await expect(page.locator('.viewer-controls')).toHaveCSS('opacity', '1')
  const paper = page.locator('.obi-strip')
  const spine = page.locator('.obi-spine-fold')
  const back = page.locator('.obi-back-fold')
  const folded = await spine.evaluate((el) => getComputedStyle(el).transform)
  await expect(paper).toHaveCSS('visibility', 'hidden')
  await expect(page.getByRole('button', { name: 'Attached', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Front', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Front', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Attached', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Attached', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.screenshot({ path: 'test-results/obi-attached-front.png' })
  await page.getByRole('button', { name: 'Lay flat', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Attached', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Lay flat', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(spine).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)')
  await expect(back).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)')
  await expect(page.getByRole('button', { name: 'Back', exact: true })).toBeDisabled()
  await page.screenshot({ path: 'test-results/obi-flat.png' })
  await page.getByRole('button', { name: 'Hidden', exact: true }).click()
  await expect(paper).toHaveCSS('visibility', 'hidden')
  await expect(paper).toHaveAttribute('aria-hidden', 'true')
  await expect(page.getByRole('button', { name: 'Back', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Attached', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Attached', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(paper).toHaveCSS('visibility', 'visible')
  await expect(spine).toHaveCSS('transform', folded)
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Back', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.screenshot({ path: 'test-results/obi-attached-back.png' })
  const openingMotion = page.evaluate(async () => {
    const hiddenWhileOpen: boolean[] = []
    while (document.querySelector('.case-view-selector button:nth-child(2)')?.getAttribute('aria-pressed') !== 'true') {
      const lid = new DOMMatrix(getComputedStyle(document.querySelector('.case-lid')!).transform)
      if (lid.m11 < 0.999) hiddenWhileOpen.push(getComputedStyle(document.querySelector('.obi-strip')!).visibility === 'hidden')
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    }
    return hiddenWhileOpen
  })
  await page.getByRole('button', { name: 'Inside', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Inside', exact: true })).toHaveAttribute('aria-pressed', 'true')
  const hiddenWhileOpen = await openingMotion
  expect(hiddenWhileOpen.length).toBeGreaterThan(0)
  expect(hiddenWhileOpen.every(Boolean)).toBe(true)
  await expect(paper).toHaveCSS('visibility', 'hidden')
  await expect(paper).toHaveAttribute('aria-hidden', 'true')
  await expect(page.getByRole('button', { name: 'Hidden', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Attached', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Back', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Attached', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Lay flat', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Lay flat', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.screenshot({ path: 'test-results/obi-flat-from-back.png' })
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('[data-album-id="album-3"]')).toBeFocused()
})

test('OBI inspection fits a phone, respects reduced motion and closes during unfolding', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.locator('[data-album-id="album-1"]').click()
  await expect(page.locator('.viewer-controls')).toHaveCSS('opacity', '1')
  await expect(page.locator('.obi-strip')).toHaveCSS('visibility', 'hidden')
  await page.getByRole('button', { name: 'Lay flat', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Lay flat', exact: true })).toHaveAttribute('aria-pressed', 'true')
  for (const panel of ['.obi-front', '.obi-spine-fold', '.obi-back-fold']) {
    const box = (await page.locator(panel).boundingBox())!
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(390)
  }
  await page.screenshot({ path: 'test-results/obi-mobile.png' })
  await page.getByRole('button', { name: 'Hidden', exact: true }).click()
  await expect(page.locator('.obi-strip')).toHaveCSS('visibility', 'hidden')
  await page.getByRole('button', { name: 'Front', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Front', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Attached', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Attached', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.getByRole('button', { name: 'Lay flat', exact: true }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('[data-album-id="album-1"]')).toBeFocused()
})

test('uploaded OBI scans persist separately from spine artwork and can be reset', async ({ page }) => {
  await page.goto('/')
  const image = await page.screenshot()
  await page.locator('[data-album-id="album-1"]').click()
  await expect(page.locator('.viewer-controls')).toHaveCSS('opacity', '1')
  await page.getByRole('button', { name: 'Edit recording', exact: true }).click()
  await page.getByLabel('Upload OBI paper strip').setInputFiles({ name: 'obi.png', mimeType: 'image/png', buffer: image })
  await confirmCrop(page)
  await expect(page.getByRole('img', { name: 'OBI preview' })).toHaveAttribute('src', /^data:image\/png/)
  await page.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.reload()
  await page.locator('[data-album-id="album-1"]').click()
  await expect(page.locator('.viewer-controls')).toHaveCSS('opacity', '1')
  await expect(page.locator('.obi-uploaded')).toHaveCount(3)
  await expect(page.locator('.case-spine img')).toHaveCount(0)
  await expect(page.locator('.obi-print-front img')).toHaveAttribute('src', /^data:image\/png/)
  for (const image of await page.locator('.obi-uploaded img').all()) {
    expect(await image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true)
  }
  await page.getByRole('button', { name: 'Edit recording', exact: true }).click()
  await page.getByRole('button', { name: 'Use generated OBI', exact: true }).click()
  const generatedObi = (await page.getByRole('img', { name: 'OBI preview', exact: true }).getAttribute('src'))!
  expect(decodeURIComponent(generatedObi)).toContain('Blue Hours')
  await page.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.reload()
  await page.locator('[data-album-id="album-1"]').click()
  await expect(page.locator('.viewer-controls')).toHaveCSS('opacity', '1')
  await expect(page.locator('.obi-uploaded')).toHaveCount(0)
  await expect(page.locator('.obi-print-front')).toHaveCSS('background-image', `url("${generatedObi}")`)
})

test('invalid uploads explain the problem and preserve the default cover', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add recording' }).click()
  const defaultCover = await page.getByRole('img', { name: 'Cover preview', exact: true }).getAttribute('src')
  await page.setViewportSize({ width: 390, height: 844 })
  const input = page.getByLabel('Upload cover artwork')
  await input.focus()
  await input.setInputFiles({
    name: 'notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('not an image'),
  })
  const warning = page.getByRole('alertdialog', { name: 'Image upload failed', exact: true })
  await expect(warning).toBeVisible()
  await expect(warning.locator('p')).toHaveText('Choose a JPG, PNG or WebP image.')
  await expect(warning.getByRole('button', { name: 'OK', exact: true })).toBeFocused()
  const box = (await warning.boundingBox())!
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.y).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(390)
  expect(box.y + box.height).toBeLessThanOrEqual(844)
  await page.screenshot({ path: 'test-results/artwork-warning-mobile.png' })
  await page.keyboard.press('Escape')
  await expect(warning).toHaveCount(0)
  await expect(page.locator('.album-editor')).toBeVisible()
  await expect(input).toBeFocused()
  await input.evaluate((element) => {
    const transfer = new DataTransfer()
    transfer.items.add(new File([new Uint8Array(64 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' }))
    const upload = element as HTMLInputElement
    upload.files = transfer.files
    upload.dispatchEvent(new Event('change', { bubbles: true }))
  })
  await dismissArtworkAlert(page, 'Choose an image no larger than 64 MB.')
  await expect(input).toBeFocused()
  await input.setInputFiles({
    name: 'corrupt.png',
    mimeType: 'image/png',
    buffer: Buffer.from('not a real PNG'),
  })
  await dismissArtworkAlert(page, 'This file could not be opened as an image.')
  await expect(page.getByRole('img', { name: 'Cover preview', exact: true })).toHaveAttribute('src', defaultCover!)
  await expect(page.locator('.shelf-cd')).toHaveCount(24)
  await page
    .getByRole('textbox', { name: 'Album title', exact: true })
    .fill('Default artwork')
  await page
    .getByRole('textbox', { name: 'Artist', exact: true })
    .fill('Local Artist')
  await page.getByRole('button', { name: 'Add recording', exact: true }).click()
  await expect(page.locator('.album-editor')).toHaveCount(0)
  await expect(page.locator('.shelf-cd')).toHaveCount(25)
  await page.reload()
  await page.getByRole('button', { name: 'Open Default artwork by Local Artist', exact: true }).click()
  await expect(page.getByRole('img', { name: 'Default artwork cover artwork' })).toHaveAttribute('src', /^data:image\/svg\+xml/)
})

test('an image exactly 64 MB can be cropped, saved and reloaded', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.getByRole('button', { name: 'Add recording' }).click()
  await page.getByRole('textbox', { name: 'Album title', exact: true }).fill('Large artwork')
  await page.getByRole('textbox', { name: 'Artist', exact: true }).fill('Local Artist')
  await expect(page.locator('.upload-guidance')).toHaveText('JPG, PNG or WebP · Up to 64 MB per image')
  await page.getByLabel('Upload cover artwork').evaluate(async (element) => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 32
    const context = canvas.getContext('2d')!
    context.fillStyle = '#00ff00'
    context.fillRect(0, 0, 32, 32)
    const png = await new Promise<Blob>((resolve) => canvas.toBlob((blob) => resolve(blob!), 'image/png'))
    // PNG 允许结束标记后的填充，验证真实文件大小边界而不分配超大位图。
    const file = new File([png, new Uint8Array(64 * 1024 * 1024 - png.size)], 'large.png', { type: 'image/png' })
    const transfer = new DataTransfer()
    transfer.items.add(file)
    const upload = element as HTMLInputElement
    upload.files = transfer.files
    upload.dispatchEvent(new Event('change', { bubbles: true }))
  })
  await confirmCrop(page)
  await expect(page.getByRole('alertdialog')).toHaveCount(0)
  const preview = page.getByRole('img', { name: 'Cover preview', exact: true })
  await expect(preview).toHaveAttribute('src', /^data:image\/png/)
  const source = (await preview.getAttribute('src'))!
  await page.getByRole('button', { name: 'Add recording', exact: true }).click()
  await expect(page.locator('.album-editor')).toHaveCount(0)
  await page.reload()
  await page.getByRole('button', { name: 'Open Large artwork by Local Artist', exact: true }).click()
  await expect(page.locator('.lid-front img')).toHaveAttribute('src', source)
})

test('a storage read failure can be retried without overwriting the saved collection', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const open = indexedDB.open.bind(indexedDB)
    indexedDB.open = (name, version) => {
      if (sessionStorage.getItem('test-block-storage') === 'true')
        throw new DOMException('Storage blocked', 'SecurityError')
      return open(name, version)
    }
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Edit shelf', exact: true }).click()
  const source = page.locator('[data-album-id="album-1"]')
  const position = (await source.locator('..').boundingBox())!
  await source.focus()
  await page.keyboard.press('Space')
  await expect(source.locator('..')).toHaveClass(/is-dragging/)
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  )
  await page.keyboard.press('ArrowRight')
  await expect
    .poll(async () => (await source.locator('..').boundingBox())!.x)
    .toBeGreaterThan(position.x + position.width / 2)
  await page.keyboard.press('Space')
  await expect(page.locator('.shelf-cd').first()).toHaveAttribute(
    'data-album-id',
    'album-2',
  )
  await expect(
    page.getByText('Saved in this browser.', { exact: true }),
  ).toBeVisible()
  await page.evaluate(() =>
    sessionStorage.setItem('test-block-storage', 'true'),
  )
  await page.reload()
  await expect(page.getByRole('alert')).toContainText('could not be loaded')
  await expect(
    page.getByRole('button', { name: 'Add recording' }),
  ).toBeDisabled()
  await page.evaluate(() => sessionStorage.removeItem('test-block-storage'))
  await page.getByRole('button', { name: 'Retry', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page.locator('.shelf-cd').first()).toHaveAttribute(
    'data-album-id',
    'album-2',
  )
  await expect(
    page.getByRole('button', { name: 'Add recording' }),
  ).toBeEnabled()
})

test('a failed save reports the error and rolls back uploaded artwork', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await expect(page.locator('.shelf-cd')).toHaveCount(24)
  const image = await page.screenshot()
  await page.getByRole('button', { name: 'Add recording' }).click()
  await page.getByRole('textbox', { name: 'Album title', exact: true }).fill('Unsaved recording')
  await page.getByRole('textbox', { name: 'Artist', exact: true }).fill('Local Artist')
  await page.getByLabel('Upload cover artwork').setInputFiles({ name: 'cover.png', mimeType: 'image/png', buffer: image })
  await confirmCrop(page)
  await expect(page.getByRole('img', { name: 'Cover preview', exact: true })).toBeVisible()
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function (value, key) {
      if (this.name === 'collection') throw new DOMException('Storage full', 'QuotaExceededError')
      return put.call(this, value, key)
    }
  })
  await page.getByRole('button', { name: 'Add recording', exact: true }).click()
  await expect(page.locator('.editor-error')).toContainText('could not be saved')
  await expect(page.locator('.collection-storage-note')).toContainText('could not be saved')
  await expect(page.locator('.shelf-cd')).toHaveCount(24)
  await discardEditor(page)
  await page.reload()
  await expect(page.locator('.shelf-cd')).toHaveCount(24)
  expect(await page.evaluate(() => new Promise<number>((resolve, reject) => {
    const request = indexedDB.open('cd-cabinet')
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const database = request.result
      const transaction = database.transaction('artwork', 'readonly')
      const count = transaction.objectStore('artwork').count()
      transaction.oncomplete = () => { database.close(); resolve(count.result) }
      transaction.onerror = () => { database.close(); reject(transaction.error) }
    }
  }))).toBe(0)
  expect(errors).toEqual([])
})

test('the artwork editor fits a phone and restores focus on cancel', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  const source = page.locator('[data-album-id="album-1"]')
  await source.click()
  await expect(page.locator('.viewer-controls')).toHaveCSS('opacity', '1')
  await page
    .getByRole('button', { name: 'Edit recording', exact: true })
    .click()
  const editor = page.getByRole('main', {
    name: 'Edit recording',
    exact: true,
  })
  await expect(editor).toBeVisible()
  expect((await editor.boundingBox())!.width).toBeLessThanOrEqual(390)
  await expect(
    page.getByRole('textbox', { name: 'Album title', exact: true }),
  ).toHaveValue('Blue Hours')
  await page.screenshot({ path: 'test-results/editor-mobile.png' })
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.screenshot({ path: 'test-results/editor-desktop.png' })
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(source).toBeFocused()
  await expect(page.locator('.shelf-cd')).toHaveCount(24)
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

test('i18n allows switching between English, Chinese and Japanese and persists', async ({
  page,
}) => {
  await page.goto('/')
  // Default is English
  await expect(
    page.getByRole('button', { name: 'Edit shelf', exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Add recording' })).toBeVisible()

  // Switch to Chinese
  const langSelect = page.getByRole('combobox', { name: 'Select language' })
  await langSelect.selectOption('zh')
  await expect(
    page.getByRole('button', { name: '整理唱片架', exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: '添加专辑' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh')

  // Switch to Japanese
  await page.getByRole('combobox', { name: '选择语言' }).selectOption('ja')
  await expect(
    page.getByRole('button', { name: '棚を整理', exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'アルバムを追加' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'ja')

  // Reload and verify persistence
  await page.reload()
  await expect(
    page.getByRole('button', { name: '棚を整理', exact: true }),
  ).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'ja')

  // Switch back to English
  await page.getByRole('combobox', { name: '言語を選択' }).selectOption('en')
  await expect(
    page.getByRole('button', { name: 'Edit shelf', exact: true }),
  ).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
})

