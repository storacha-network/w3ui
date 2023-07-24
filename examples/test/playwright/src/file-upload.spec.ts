import { test, expect } from '@playwright/test'

for (const ui of ['react', 'solid'/*, 'vue' is failing to submit the form, but only in tests */ /* 'vanilla' not work atm */]) {
  test(`${ui}: file upload`, async ({ page }) => {
    await page.goto(`/${ui}/file-upload/`)
    await expect(page).toHaveTitle('W3UI File Upload Example App')

    const input = page.getByRole('textbox', { name: 'Email address:' })
    await input.fill('test@example.org')
    await input.press('Enter')
    await expect(page.getByText('Verify your email address!')).toBeVisible()
  })
}
