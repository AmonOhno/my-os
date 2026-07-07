import { describe, expect, it } from 'vitest';
import { newEntryId, newLinkId, newReviewId } from './ids';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('ids', () => {
  it('種別ごとのプレフィックス + UUID を生成する', () => {
    expect(newEntryId()).toMatch(/^ent_/);
    expect(newLinkId()).toMatch(/^lnk_/);
    expect(newReviewId()).toMatch(/^rev_/);
    expect(newEntryId().slice(4)).toMatch(UUID);
  });

  it('毎回ユニークなIDを生成する', () => {
    const ids = new Set(Array.from({ length: 100 }, () => newEntryId()));
    expect(ids.size).toBe(100);
  });
});
