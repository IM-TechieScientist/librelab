import { expect, test } from '@playwright/test'

test('captures from the built-in simulator and renders the analyzer workspace', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('LibreLab Simulator')).toBeVisible()
  await expect(page.getByText('Offline demo')).toBeVisible()

  await page.locator('.device-picker').click()
  await expect(page.getByText('Ready')).toBeVisible()

  await expect(page.locator('.capture-button')).toBeEnabled()
  await page.locator('.capture-button').click()
  await expect(page.getByText('Capture 1').first()).toBeVisible({ timeout: 8_000 })

  await expect(page.getByTestId('waveform-canvas')).toHaveAttribute('aria-label', /mixed waveform/)
  const canvasBox = await page.getByTestId('waveform-canvas').boundingBox()
  expect(canvasBox?.width).toBeGreaterThan(500)
  expect(canvasBox?.height).toBeGreaterThan(300)

  await page.getByRole('button', { name: 'Analyzers' }).click()
  await expect(page.getByText('Protocol analyzers')).toBeVisible()
  await expect(page.getByText('Decoded frames')).toBeVisible()

  await page.getByRole('button', { name: 'Buses' }).click()
  await page.getByLabel('Bus message').fill('ping')
  await page.getByRole('button', { name: 'Send' }).click()
  await expect(page.getByText('RX: ping')).toBeVisible()
})
