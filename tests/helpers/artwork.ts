import { expect, type Page } from '@playwright/test'

export async function confirmCrop(page: Page, total = 1) {
  const dialog = page.getByRole('dialog', { name: 'Crop image', exact: true })
  for (let current = 1; current <= total; current += 1) {
    await expect(dialog).toBeVisible()
    if (total > 1) await expect(dialog.getByRole('status')).toHaveText(`Image ${current} of ${total}`)
    const apply = dialog.getByRole('button', { name: 'Use crop', exact: true })
    await expect(apply).toBeEnabled()
    await apply.click()
  }
  await expect(page.locator('.artwork-cropper')).toHaveCount(0)
}

export async function dismissArtworkAlert(page: Page, message: string) {
  const dialog = page.getByRole('alertdialog', { name: 'Image upload failed', exact: true })
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('p')).toHaveText(message)
  await expect(dialog.getByRole('button', { name: 'OK', exact: true })).toBeFocused()
  await dialog.getByRole('button', { name: 'OK', exact: true }).click()
  await expect(dialog).toHaveCount(0)
}

export async function selectBookletPage(page: Page, number: number) {
  await page.getByRole('combobox', { name: 'Choose an inner page to edit', exact: true }).selectOption({ index: number - 1 })
}

export async function bookletImages(page: Page, count: number) {
  const picker = page.getByRole('combobox', { name: 'Choose an inner page to edit', exact: true })
  await expect(picker.locator('option')).toHaveCount(count)
  const sources: string[] = []
  for (let number = 1; number <= count; number += 1) {
    await selectBookletPage(page, number)
    await expect(page.locator('.booklet-pages-editor li')).toHaveCount(1)
    sources.push((await page.locator('.booklet-pages-editor li img').getAttribute('src'))!)
  }
  return sources
}

export async function discardEditor(page: Page) {
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  const confirmation = page.getByRole('alertdialog', { name: 'Discard unsaved changes?', exact: true })
  await expect(confirmation).toBeVisible()
  await confirmation.getByRole('button', { name: 'Discard changes', exact: true }).click()
  await expect(page.locator('.album-editor')).toHaveCount(0)
}
