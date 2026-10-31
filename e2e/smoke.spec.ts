import { expect, test } from '@playwright/test';

// 主要な画面フローのスモーク E2E。各テストは新しいブラウザコンテキスト（= 空の IndexedDB）で動く。

test('きょう画面が表示され、空のときに督促文言を出さない', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^(おはよう|こんにちは|こんばんは)。$/);
  await expect(page.getByRole('link', { name: 'きょう' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'つながり' })).toBeVisible();
  await expect(page.getByText('タイムライン')).toHaveCount(0);
  await expect(page.getByText(/記録がありません/)).toHaveCount(0);
});

test('記録シートでメモをのこすと、タイムラインと領域画面に表示され再読込後も残る', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'いまの状態をのこす' }).click();

  const sheet = page.getByRole('dialog', { name: 'いまの状態をのこす' });
  await expect(sheet).toBeVisible();
  const save = sheet.getByRole('button', { name: 'のこす', exact: true });
  await expect(save).toBeDisabled();

  await sheet.getByRole('button', { name: 'Health', exact: true }).click();
  await sheet.locator('textarea').fill('E2E: 朝の散歩');
  await expect(save).toBeEnabled();
  await save.click();

  await expect(sheet).toHaveCount(0);
  await expect(page.getByText('タイムライン')).toBeVisible();
  await expect(page.locator('.entry-list').getByText('E2E: 朝の散歩')).toBeVisible();

  // IndexedDB に保存されていること
  await page.reload();
  await expect(page.locator('.entry-list').getByText('E2E: 朝の散歩')).toBeVisible();

  // 状態カードから領域画面へ
  await page.locator('.status-card', { hasText: 'Health' }).click();
  await expect(page).toHaveURL(/#\/domain\/health$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Health' })).toBeVisible();
  await expect(page.getByText('E2E: 朝の散歩')).toBeVisible();
});

test('領域が未選択なら保存できず、背景タップでシートが閉じる', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'いまの状態をのこす' }).click();
  const sheet = page.getByRole('dialog', { name: 'いまの状態をのこす' });
  await sheet.locator('textarea').fill('領域なし');
  await expect(sheet.getByRole('button', { name: 'のこす', exact: true })).toBeDisabled();

  await page.locator('.sheet-backdrop').click({ position: { x: 5, y: 5 } });
  await expect(sheet).toHaveCount(0);
});

test('タブとリンクで つながり・設定 画面を行き来できる', async ({ page }) => {
  await page.goto('./');

  await page.getByRole('link', { name: 'つながり' }).click();
  await expect(page).toHaveURL(/#\/connections$/);
  await expect(page.getByRole('heading', { level: 1, name: 'つながり' })).toBeVisible();

  await page.getByRole('link', { name: 'きょう' }).click();
  await expect(page).toHaveURL(/#\/$/);

  await page.getByRole('link', { name: '設定' }).click();
  await expect(page).toHaveURL(/#\/settings$/);
  await expect(page.getByRole('heading', { level: 1, name: '設定' })).toBeVisible();

  await page.getByRole('link', { name: '‹ きょう' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/。$/);
});
