import { test, expect } from '@playwright/test'

for (const ui of [
  'react',
  'solid' /* `vue` not exit yet, 'vanilla' not work atm */,
]) {
  test(`${ui}: multi file upload`, async ({ page }) => {
    await page.goto(`/${ui}/multi-file-upload/`)
    await expect(page).toHaveTitle('W3UI Multi File Upload Example App')

    const input = page.getByRole('textbox', { name: 'Email address:' })
    await input.fill('test@example.org')
    await input.press('Enter')
    await expect(page.getByText('Verify your email address!')).toBeVisible()
  })
}
