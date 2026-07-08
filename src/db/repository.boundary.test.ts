import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import {
  listEntriesByDomain,
  listMetricPresets,
  listRecentEntries,
  saveEntry,
} from './repository';

beforeEach(async () => {
  await Promise.all([db.entries.clear(), db.links.clear()]);
});

const at = (day: number) => `2026-07-${String(day).padStart(2, '0')}T10:00:00+09:00`;

describe('一覧クエリの limit 境界', () => {
  it('listRecentEntries は limit 件で打ち切る', async () => {
    for (let i = 1; i <= 5; i++) {
      await saveEntry({ kind: 'note', domains: ['health'], body: `n${i}`, occurredAt: at(i) });
    }
    const list = await listRecentEntries(3);
    expect(list).toHaveLength(3);
    // 新しい順に3件
    expect(list.map((e) => e.body)).toEqual(['n5', 'n4', 'n3']);
  });

  it('listEntriesByDomain も limit 件で打ち切る（新しい順）', async () => {
    for (let i = 1; i <= 4; i++) {
      await saveEntry({ kind: 'note', domains: ['career'], body: `c${i}`, occurredAt: at(i) });
    }
    const list = await listEntriesByDomain('career', 2);
    expect(list.map((e) => e.body)).toEqual(['c4', 'c3']);
  });
});

describe('listMetricPresets の境界', () => {
  it('既定で最大5種類まで（直近使用順）', async () => {
    for (let i = 1; i <= 7; i++) {
      await saveEntry({
        kind: 'metric',
        domains: ['health'],
        payload: { label: `指標${i}`, value: i },
        occurredAt: at(i),
      });
    }
    const presets = await listMetricPresets();
    expect(presets).toHaveLength(5);
    // 直近に使ったラベルが含まれ、古いものは落ちる
    expect(presets.map((p) => p.label)).toContain('指標7');
    expect(presets.map((p) => p.label)).not.toContain('指標1');
  });

  it('metric 以外のエントリは無視する', async () => {
    await saveEntry({ kind: 'note', domains: ['health'], body: 'x' });
    expect(await listMetricPresets()).toEqual([]);
  });
});
