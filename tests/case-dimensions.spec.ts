import { test, expect } from '@playwright/test'

for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
  for (const reducedMotion of ['reduce', 'no-preference'] as const) {
    test(`real case and paper dimensions fit ${viewport.width}px with ${reducedMotion} motion`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await page.emulateMedia({ reducedMotion })
      await page.goto('/')
      const source = page.locator('[data-album-id="album-1"]')
      await source.click()
      await expect(page.getByRole('button', { name: 'Inside', exact: true })).toBeEnabled()
      const dimensions = await page.locator('.cd-case').evaluate((element) => {
        function size(target: Element) {
          const style = getComputedStyle(target)
          return { width: Number.parseFloat(style.width), height: Number.parseFloat(style.height) }
        }
        return {
          box: size(element),
          hinge: size(element.querySelector('.case-hinge')!),
          lid: size(element.querySelector('.lid-front')!),
          booklet: size(element.querySelector('.lid-front img')!),
          bookletBack: size(element.querySelector('.lid-inside img')!),
          back: size(element.querySelector('.case-rear img')!),
          innerBack: size(element.querySelector('.case-back img')!),
          disc: size(element.querySelector('.disc')!),
          ring: size(element.querySelector('.tray-ring')!),
          obi: size(element.querySelector('.obi-strip')!),
          edge: size(element.querySelector('.edge-top')!),
          spine: size(element.querySelector('.case-spine')!),
        }
      })
      const unitsPerMm = dimensions.box.height / 125
      // 浏览器布局按子像素取整，两边独立换算时允许最多 1/32 px 的误差。
      function expectLength(length: number, mm: number) {
        expect(Math.abs(length - mm * unitsPerMm)).toBeLessThan(1 / 32)
      }
      expectLength(dimensions.box.width, 142)
      expectLength(dimensions.hinge.width, 17)
      expectLength(dimensions.hinge.height, 125)
      expectLength(dimensions.lid.width, 125)
      for (const paper of [dimensions.booklet, dimensions.bookletBack, dimensions.disc]) {
        expect(paper.width / paper.height).toBeCloseTo(1, 4)
        expectLength(paper.height, 120)
      }
      for (const paper of [dimensions.back, dimensions.innerBack]) {
        expectLength(paper.width, 138)
        expectLength(paper.height, 118)
      }
      expect(dimensions.ring.width / dimensions.ring.height).toBeCloseTo(1, 4)
      expect(dimensions.edge.width).toBeCloseTo(dimensions.box.width, 2)
      expect(dimensions.spine.height).toBeCloseTo(dimensions.box.height, 2)
      expectLength(dimensions.obi.height, 125)
      for (const view of ['Back', 'Front', 'Back', 'Inside']) {
        await page.getByRole('button', { name: view, exact: true }).click()
        await expect(page.getByRole('button', { name: view, exact: true })).toHaveAttribute('aria-pressed', 'true')
        for (const surface of ['.case-back', '.lid-front']) {
          const bounds = (await page.locator(surface).boundingBox())!
          expect(bounds.x).toBeGreaterThanOrEqual(0)
          expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width)
        }
        if (view === 'Front') {
          const booklet = (await page.locator('.lid-front img').boundingBox())!
          const hinge = (await page.locator('.case-hinge').boundingBox())!
          const lid = (await page.locator('.lid-front').boundingBox())!
          expect(Math.abs(hinge.x + hinge.width - lid.x)).toBeLessThan(1)
          expect(booklet.x).toBeGreaterThan(hinge.x + hinge.width)
          expect(booklet.width / booklet.height).toBeCloseTo(1, 3)
          await page.screenshot({ path: `test-results/case-front-${viewport.width}-${reducedMotion}.png` })
        }
      }
      await page.screenshot({ path: `test-results/case-dimensions-${viewport.width}-${reducedMotion}.png` })
      await page.getByRole('button', { name: 'Close album', exact: true }).click()
      await expect(page.locator('.active-layer')).toHaveCount(0)
      await expect(source).toBeFocused()
    })
  }
}
