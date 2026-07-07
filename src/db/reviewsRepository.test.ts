import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { getReview, upsertReview } from './reviewsRepository';

beforeEach(async () => {
  await db.reviews.clear();
});

describe('upsertReview', () => {
  it('新規作成で id/createdAt が付与される', async () => {
    const review = await upsertReview('2026-07', '良い月だった');
    expect(review.id).toMatch(/^rev_/);
    expect(review.month).toBe('2026-07');
    expect(review.createdAt).toBe(review.updatedAt);
  });

  it('同じ月への2回目は上書き（1月1レコード）', async () => {
    const first = await upsertReview('2026-07', '初稿');
    const second = await upsertReview('2026-07', '書き直し');
    expect(second.id).toBe(first.id); // 同一レコードを更新
    expect(second.createdAt).toBe(first.createdAt);
    expect(await db.reviews.count()).toBe(1);
    expect((await getReview('2026-07'))?.body).toBe('書き直し');
  });

  it("月の形式が 'YYYY-MM' でなければ拒否する", async () => {
    await expect(upsertReview('2026/07', 'x')).rejects.toThrow('月の形式が不正です');
    await expect(upsertReview('2026-7', 'x')).rejects.toThrow('月の形式が不正です');
    await expect(upsertReview('', 'x')).rejects.toThrow('月の形式が不正です');
  });

  it('本文が空白のみなら拒否する', async () => {
    await expect(upsertReview('2026-07', '   ')).rejects.toThrow('本文が必要です');
  });
});

describe('getReview', () => {
  it('存在しない月は undefined', async () => {
    expect(await getReview('2020-01')).toBeUndefined();
  });

  it('月ごとに独立して取得できる', async () => {
    await upsertReview('2026-06', '6月');
    await upsertReview('2026-07', '7月');
    expect((await getReview('2026-06'))?.body).toBe('6月');
    expect((await getReview('2026-07'))?.body).toBe('7月');
  });
});
