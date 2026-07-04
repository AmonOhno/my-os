import { db } from './db';
import { newReviewId } from './ids';
import { nowIso } from './time';
import type { Review } from '../types/models';

export async function getReview(month: string): Promise<Review | undefined> {
  return db.reviews.where('month').equals(month).first();
}

// 1月につき1レコード。書き直しは上書き編集（docs/feature/connections.md §5）
export async function upsertReview(month: string, body: string): Promise<Review> {
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error('月の形式が不正です');
  if (!body.trim()) throw new Error('本文が必要です');
  const now = nowIso();
  const existing = await getReview(month);
  if (existing) {
    const updated: Review = { ...existing, body, updatedAt: now };
    await db.reviews.put(updated);
    return updated;
  }
  const review: Review = { id: newReviewId(), month, body, createdAt: now, updatedAt: now };
  await db.reviews.add(review);
  return review;
}
