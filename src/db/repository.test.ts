import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import {
  deleteEntry,
  getEntry,
  listEntriesByDomain,
  listEntriesForMonth,
  listMetricPresets,
  listRecentEntries,
  saveEntry,
  updateEntry,
} from './repository';

beforeEach(async () => {
  await Promise.all([db.entries.clear(), db.links.clear(), db.reviews.clear()]);
});

describe('saveEntry のバリデーション', () => {
  it('domains が空なら保存できない', async () => {
    await expect(saveEntry({ kind: 'note', domains: [], body: 'x' })).rejects.toThrow(
      '領域を1つ以上えらんでください',
    );
  });

  it('note は本文必須（空白のみは不可）', async () => {
    await expect(saveEntry({ kind: 'note', domains: ['health'], body: '  ' })).rejects.toThrow(
      '本文が必要です',
    );
  });

  it('mood は気分必須', async () => {
    await expect(saveEntry({ kind: 'mood', domains: ['mental'] })).rejects.toThrow(
      '気分をえらんでください',
    );
  });

  it('metric はラベルと有限な数値が必須', async () => {
    await expect(
      saveEntry({ kind: 'metric', domains: ['health'], payload: { label: '', value: 1 } }),
    ).rejects.toThrow('ラベルと数値が必要です');
    await expect(
      saveEntry({ kind: 'metric', domains: ['health'], payload: { label: '体重', value: NaN } }),
    ).rejects.toThrow('ラベルと数値が必要です');
  });

  it('event はタイトル必須', async () => {
    await expect(saveEntry({ kind: 'event', domains: ['travel'] })).rejects.toThrow(
      'タイトルが必要です',
    );
  });
});

describe('saveEntry / getEntry / updateEntry', () => {
  it('保存したエントリを取得できる（id/createdAt が付与される）', async () => {
    const saved = await saveEntry({ kind: 'note', domains: ['health'], body: '散歩した' });
    expect(saved.id).toMatch(/^ent_/);
    expect(saved.createdAt).toBe(saved.updatedAt);
    const got = await getEntry(saved.id);
    expect(got?.body).toBe('散歩した');
  });

  it('occurredAt 未指定なら現在時刻を使う', async () => {
    const saved = await saveEntry({ kind: 'note', domains: ['health'], body: 'x' });
    expect(saved.occurredAt).toBe(saved.createdAt);
  });

  it('更新で内容が変わり createdAt は維持される', async () => {
    const saved = await saveEntry({ kind: 'note', domains: ['health'], body: '旧' });
    const updated = await updateEntry(saved.id, {
      kind: 'note',
      domains: ['health', 'mental'],
      body: '新',
    });
    expect(updated.body).toBe('新');
    expect(updated.domains).toEqual(['health', 'mental']);
    expect(updated.createdAt).toBe(saved.createdAt);
  });

  it('存在しないIDの更新はエラー', async () => {
    await expect(
      updateEntry('ent_missing', { kind: 'note', domains: ['health'], body: 'x' }),
    ).rejects.toThrow('記録が見つかりません');
  });
});

describe('一覧系クエリ', () => {
  it('listRecentEntries は occurredAt 降順', async () => {
    await saveEntry({ kind: 'note', domains: ['health'], body: 'a', occurredAt: '2026-07-01T10:00:00+09:00' });
    await saveEntry({ kind: 'note', domains: ['health'], body: 'b', occurredAt: '2026-07-03T10:00:00+09:00' });
    await saveEntry({ kind: 'note', domains: ['health'], body: 'c', occurredAt: '2026-07-02T10:00:00+09:00' });
    const list = await listRecentEntries();
    expect(list.map((e) => e.body)).toEqual(['b', 'c', 'a']);
  });

  it('listEntriesByDomain は該当領域のみ降順で返す', async () => {
    await saveEntry({ kind: 'note', domains: ['health'], body: 'h1', occurredAt: '2026-07-01T10:00:00+09:00' });
    await saveEntry({ kind: 'note', domains: ['career', 'health'], body: 'hc', occurredAt: '2026-07-02T10:00:00+09:00' });
    await saveEntry({ kind: 'note', domains: ['career'], body: 'c1', occurredAt: '2026-07-03T10:00:00+09:00' });
    const list = await listEntriesByDomain('health');
    expect(list.map((e) => e.body)).toEqual(['hc', 'h1']);
  });

  it("listEntriesForMonth は 'YYYY-MM' のエントリのみ返す", async () => {
    await saveEntry({ kind: 'note', domains: ['health'], body: 'jun', occurredAt: '2026-06-30T23:59:59+09:00' });
    await saveEntry({ kind: 'note', domains: ['health'], body: 'jul', occurredAt: '2026-07-01T00:00:00+09:00' });
    const list = await listEntriesForMonth('2026-07');
    expect(list.map((e) => e.body)).toEqual(['jul']);
  });

  it('listMetricPresets は直近使用のラベルを重複なく返す', async () => {
    await saveEntry({ kind: 'metric', domains: ['health'], payload: { label: '体重', value: 60, unit: 'kg' }, occurredAt: '2026-07-01T10:00:00+09:00' });
    await saveEntry({ kind: 'metric', domains: ['health'], payload: { label: '睡眠', value: 7, unit: 'h' }, occurredAt: '2026-07-02T10:00:00+09:00' });
    await saveEntry({ kind: 'metric', domains: ['health'], payload: { label: '体重', value: 59.5, unit: 'kg' }, occurredAt: '2026-07-03T10:00:00+09:00' });
    const presets = await listMetricPresets();
    expect(presets).toHaveLength(2);
    const labels = presets.map((p) => p.label);
    expect(labels).toContain('体重');
    expect(labels).toContain('睡眠');
  });
});

describe('deleteEntry', () => {
  it('エントリと参照リンクを同時に削除する', async () => {
    const a = await saveEntry({ kind: 'note', domains: ['health'], body: 'a' });
    const b = await saveEntry({ kind: 'note', domains: ['health'], body: 'b' });
    await db.links.add({ id: 'lnk_1', fromEntry: a.id, toEntry: b.id, createdAt: a.createdAt });
    await db.links.add({ id: 'lnk_2', fromEntry: b.id, toEntry: a.id, createdAt: a.createdAt });

    await deleteEntry(a.id);

    expect(await getEntry(a.id)).toBeUndefined();
    expect(await getEntry(b.id)).toBeDefined();
    expect(await db.links.count()).toBe(0);
  });
});
