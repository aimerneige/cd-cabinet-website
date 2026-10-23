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
