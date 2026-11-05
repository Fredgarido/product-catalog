import { expect, test } from '@playwright/test'

test('create a product, change its stock and delete it', async ({ page }) => {
  const name = `E2E Lens ${Date.now()}`

  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible()
  await expect(page.locator('.product-name').first()).toBeVisible()

  await page.getByRole('link', { name: 'New product' }).click()
  await page.getByLabel('Name').fill(name)
  await page.getByLabel('Price').fill('12.5')
  await page.getByLabel('Initial stock').fill('7')
  await page.getByLabel('Category').click()
  await page.getByRole('option', { name: 'Lenses' }).click()
  await page.getByRole('button', { name: 'Create product' }).click()

  const row = page.getByRole('row').filter({ hasText: name })
  await expect(row).toBeVisible()
  await expect(row).toContainText('Lenses')
  await expect(row).toContainText('€12.50')
  await expect(row.locator('.stock')).toHaveText('7')

  await row.getByRole('button', { name: `Adjust stock of ${name}` }).click()
  const stockDialog = page.getByRole('dialog')
  await stockDialog.getByText('Remove', { exact: true }).click()
  await stockDialog.getByLabel('Quantity').fill('3')
  await stockDialog.getByRole('button', { name: 'Remove stock' }).click()
  await expect(row.locator('.stock')).toHaveText('4')

  await row.getByRole('button', { name: `Delete ${name}` }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()
  await expect(row).toHaveCount(0)
})
