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
