import { db } from './db';
import { newLinkId } from './ids';
import { nowIso } from './time';
import type { Link } from '../types/models';

// リンクは無向として扱う: {from,to} と {to,from} を同一視する（docs/database/schema.md §3）

export async function findLinkBetween(a: string, b: string): Promise<Link | undefined> {
  const candidates = await db.links.where('fromEntry').anyOf([a, b]).toArray();
  return candidates.find(
    (l) => (l.fromEntry === a && l.toEntry === b) || (l.fromEntry === b && l.toEntry === a),
  );
}

export async function createLink(fromEntry: string, toEntry: string, note?: string): Promise<Link> {
  if (fromEntry === toEntry) throw new Error('同じ記録どうしはつなげられません');
  const [a, b] = await Promise.all([db.entries.get(fromEntry), db.entries.get(toEntry)]);
  if (!a || !b) throw new Error('記録が見つかりません');
  if (await findLinkBetween(fromEntry, toEntry)) throw new Error('もうつながっています');
  const link: Link = {
    id: newLinkId(),
    fromEntry,
    toEntry,
    note: note?.trim() || undefined,
    createdAt: nowIso(),
  };
  await db.links.add(link);
  return link;
}

export async function deleteLink(id: string): Promise<void> {
  await db.links.delete(id);
}

// エントリ詳細の「つながりリスト」用
export async function listLinksForEntry(entryId: string): Promise<Link[]> {
  const [from, to] = await Promise.all([
    db.links.where('fromEntry').equals(entryId).toArray(),
    db.links.where('toEntry').equals(entryId).toArray(),
  ]);
  return [...from, ...to];
}

// つながりマップ用: 指定エントリ群のどちらか一端が触れているリンク
export async function listLinksTouchingEntries(entryIds: string[]): Promise<Link[]> {
  if (entryIds.length === 0) return [];
  const [from, to] = await Promise.all([
    db.links.where('fromEntry').anyOf(entryIds).toArray(),
    db.links.where('toEntry').anyOf(entryIds).toArray(),
  ]);
  const byId = new Map<string, Link>();
  for (const l of [...from, ...to]) byId.set(l.id, l);
  return [...byId.values()];
}
