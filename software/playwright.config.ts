import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  webServer: {
    command: 'npm run dev:renderer -- --host 127.0.0.1',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    url: 'http://127.0.0.1:5174'
  },
  use: {
    baseURL: 'http://127.0.0.1:5174',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  }
})
