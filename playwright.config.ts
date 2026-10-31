import { defineConfig, devices } from '@playwright/test';

// スモーク E2E（docs/testing/ci.md）。ビルド済み dist を vite preview で配信して検証する。
// 「全件パス」を厳密にするため retries は常に 0（リトライで通った flaky も合格扱いにしない）。
const PORT = 4173;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}/`,
    locale: 'ja-JP',
    timezoneId: 'Asia/Tokyo',
    // PWA の Service Worker キャッシュがテスト間で干渉しないようにする
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Pixel 7'] } }],
  webServer: {
    command: `npm run preview -- --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
