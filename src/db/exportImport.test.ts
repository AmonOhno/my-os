import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { exportData, exportFileName, importData } from './exportImport';
import type { Entry } from '../types/models';

const entry = (id: string): Entry => ({
  id,
  occurredAt: '2026-07-01T10:00:00+09:00',
  kind: 'note',
  domains: ['health'],
  body: 'x',
  createdAt: '2026-07-01T10:00:00+09:00',
  updatedAt: '2026-07-01T10:00:00+09:00',
});

beforeEach(async () => {
  await Promise.all([db.entries.clear(), db.links.clear(), db.reviews.clear()]);
});

describe('exportData', () => {
  it('全テーブルをスキーマバージョン付きで書き出す', async () => {
    await db.entries.add(entry('ent_1'));
    const data = await exportData();
    expect(data.app).toBe('myos');
    expect(data.schemaVersion).toBe(1);
    expect(data.entries).toHaveLength(1);
    expect(data.links).toEqual([]);
    expect(data.reviews).toEqual([]);
    expect(data.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe('exportFileName', () => {
  it('日付入りのファイル名を生成する', () => {
    expect(exportFileName(new Date(2026, 6, 5))).toBe('myos-export-20260705.json');
  });
});

describe('importData', () => {
  it('エクスポート→インポートで往復できる（全置換）', async () => {
    await db.entries.add(entry('ent_old'));
    const data = await exportData();

    await db.entries.clear();
    await db.entries.add(entry('ent_other'));

    const counts = await importData(data);
    expect(counts).toEqual({ entries: 1, links: 0, reviews: 0 });
    const rows = await db.entries.toArray();
    expect(rows.map((e) => e.id)).toEqual(['ent_old']); // 置換されている
  });

  it('links / reviews も含めて全テーブルを置換する', async () => {
    await db.entries.add(entry('ent_1'));
    await db.entries.add(entry('ent_2'));
    await db.links.add({
      id: 'lnk_1',
      fromEntry: 'ent_1',
      toEntry: 'ent_2',
      createdAt: '2026-07-01T10:00:00+09:00',
    });
    await db.reviews.add({
      id: 'rev_1',
      month: '2026-06',
      body: '振り返り',
      createdAt: '2026-07-01T10:00:00+09:00',
      updatedAt: '2026-07-01T10:00:00+09:00',
    });
    const data = await exportData();

    // 別内容に置き換わっている状態から復元
    await Promise.all([db.entries.clear(), db.links.clear(), db.reviews.clear()]);
    await db.reviews.add({
      id: 'rev_other',
      month: '2026-05',
      body: 'x',
      createdAt: 'y',
      updatedAt: 'y',
    });

    const counts = await importData(data);
    expect(counts).toEqual({ entries: 2, links: 1, reviews: 1 });
    expect((await db.links.toArray())[0].id).toBe('lnk_1');
    expect((await db.reviews.toArray()).map((r) => r.month)).toEqual(['2026-06']);
  });

  it('MyOS 以外のファイルは拒否する', async () => {
    await expect(importData({ app: 'other', schemaVersion: 1 })).rejects.toThrow(
      'MyOS のエクスポートファイルではありません',
    );
  });

  it('新しいスキーマバージョンは拒否する', async () => {
    await expect(
      importData({ app: 'myos', schemaVersion: 2, entries: [], links: [], reviews: [] }),
    ).rejects.toThrow('新しいバージョンのデータです');
  });

  it('配列が欠けたデータは拒否する', async () => {
    await expect(
      importData({ app: 'myos', schemaVersion: 1, entries: [], links: [] }),
    ).rejects.toThrow('読み込めないファイルです');
  });

  it('null や文字列は拒否する', async () => {
    await expect(importData(null)).rejects.toThrow('読み込めないファイルです');
  });
});
