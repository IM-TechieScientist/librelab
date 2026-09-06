import { mkdir } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'

const baseURL = process.env.LIBRELAB_STUDIO_URL ?? 'http://127.0.0.1:5174/'
const outputDir = new URL('../docs/assets/', import.meta.url)

async function reachable(url) {
  try {
    const response = await fetch(url)
    return response.ok
  } catch {
    return false
  }
}

async function waitForServer(url) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (await reachable(url)) return
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`Timed out waiting for ${url}`)
}

async function main() {
  await mkdir(outputDir, { recursive: true })

  let server = null
  if (!(await reachable(baseURL))) {
    server = spawn('npm', ['run', 'dev:renderer', '--', '--host', '127.0.0.1'], {
      cwd: new URL('../', import.meta.url),
      stdio: 'inherit'
    })
  }

  try {
    await waitForServer(baseURL)

    const browser = await chromium.launch()
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    await page.goto(baseURL)
    await page.getByText('LibreLab Simulator').waitFor()
    await page.locator('.device-picker').click()
    await page.getByText('Ready').waitFor()
    await page.locator('.capture-button').click()
    await page.getByText('Capture 1').first().waitFor()
    await page.screenshot({ path: new URL('studio-workspace.png', outputDir).pathname })

    await page.getByRole('button', { name: 'Analyzers' }).click()
    await page.screenshot({ path: new URL('studio-analyzers.png', outputDir).pathname })

    await page.getByRole('button', { name: 'Buses' }).click()
    await page.getByLabel('Bus message').fill('ping')
    await page.getByRole('button', { name: 'Send' }).click()
    await page.getByText('RX: ping').waitFor()
    await page.screenshot({ path: new URL('studio-bus-console.png', outputDir).pathname })

    await browser.close()
  } finally {
    server?.kill('SIGTERM')
  }
}

await main()
