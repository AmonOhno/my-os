import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { saveEntry } from './repository';
import {
  createLink,
  deleteLink,
  findLinkBetween,
  listLinksForEntry,
  listLinksTouchingEntries,
} from './linksRepository';
import type { Entry } from '../types/models';

let a: Entry, b: Entry, c: Entry;

beforeEach(async () => {
  await Promise.all([db.entries.clear(), db.links.clear()]);
  a = await saveEntry({ kind: 'note', domains: ['health'], body: 'a' });
  b = await saveEntry({ kind: 'note', domains: ['career'], body: 'b' });
  c = await saveEntry({ kind: 'note', domains: ['mental'], body: 'c' });
});

describe('createLink', () => {
  it('リンクを作成し note の空白は除去する', async () => {
    const link = await createLink(a.id, b.id, '  関連あり  ');
    expect(link.id).toMatch(/^lnk_/);
    expect(link.note).toBe('関連あり');
  });

  it('note が空白のみなら undefined', async () => {
    const link = await createLink(a.id, b.id, '   ');
    expect(link.note).toBeUndefined();
  });

  it('自己リンクは拒否する', async () => {
    await expect(createLink(a.id, a.id)).rejects.toThrow('同じ記録どうしはつなげられません');
  });

  it('存在しないエントリへのリンクは拒否する', async () => {
    await expect(createLink(a.id, 'ent_missing')).rejects.toThrow('記録が見つかりません');
  });

  it('重複リンクは拒否する（逆向きも同一視）', async () => {
    await createLink(a.id, b.id);
    await expect(createLink(a.id, b.id)).rejects.toThrow('もうつながっています');
    await expect(createLink(b.id, a.id)).rejects.toThrow('もうつながっています');
  });
});

describe('findLinkBetween', () => {
  it('向きに関係なく見つかる', async () => {
    const link = await createLink(a.id, b.id);
    expect((await findLinkBetween(a.id, b.id))?.id).toBe(link.id);
    expect((await findLinkBetween(b.id, a.id))?.id).toBe(link.id);
  });

  it('リンクがなければ undefined', async () => {
    expect(await findLinkBetween(a.id, c.id)).toBeUndefined();
  });
});

describe('listLinksForEntry / listLinksTouchingEntries', () => {
  it('from/to 両側のリンクを返す', async () => {
    await createLink(a.id, b.id); // a が from
    await createLink(c.id, a.id); // a が to
    const links = await listLinksForEntry(a.id);
    expect(links).toHaveLength(2);
  });

  it('listLinksTouchingEntries は重複なく返す', async () => {
    const ab = await createLink(a.id, b.id);
    await createLink(b.id, c.id);
    // a と b の両方を指定しても a-b リンクは1件だけ
    const links = await listLinksTouchingEntries([a.id, b.id]);
    expect(links).toHaveLength(2);
    expect(links.filter((l) => l.id === ab.id)).toHaveLength(1);
  });

  it('空配列指定は空を返す', async () => {
    expect(await listLinksTouchingEntries([])).toEqual([]);
  });
});

describe('deleteLink', () => {
  it('指定リンクのみ削除する', async () => {
    const ab = await createLink(a.id, b.id);
    const bc = await createLink(b.id, c.id);
    await deleteLink(ab.id);
    expect(await db.links.count()).toBe(1);
    expect(await db.links.get(bc.id)).toBeDefined();
  });
});
