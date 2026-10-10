import { expect, test } from '@playwright/test'

test('app shell loads', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByText('Schema Studio')).toBeVisible()

  // The root route resolves to the default workspace dashboard.
  await expect(
    page.getByRole('heading', { name: 'Default workspace' }),
  ).toBeVisible()
})