import { db } from './db';
import { newEntryId } from './ids';
import { nowIso } from './time';
import type { Entry, EntryKind, Domain, Mood, MetricPayload } from '../types/models';

export interface NewEntryInput {
  kind: EntryKind;
  domains: Domain[];
  occurredAt?: string;
  title?: string;
  body?: string;
  mood?: Mood;
  payload?: MetricPayload;
}

// kind ごとの必須フィールド検証（DBは型を強制しないためここで保証する）
function validateEntry(input: NewEntryInput): string | null {
  if (input.domains.length === 0) return '領域を1つ以上えらんでください';
  switch (input.kind) {
    case 'note':
      if (!input.body?.trim()) return '本文が必要です';
      break;
    case 'mood':
      if (input.mood == null) return '気分をえらんでください';
      break;
    case 'metric':
      if (!input.payload?.label.trim() || !Number.isFinite(input.payload.value))
        return 'ラベルと数値が必要です';
      break;
    case 'event':
      if (!input.title?.trim()) return 'タイトルが必要です';
      break;
  }
  return null;
}

export async function saveEntry(input: NewEntryInput): Promise<Entry> {
  const error = validateEntry(input);
  if (error) throw new Error(error);
  const now = nowIso();
  const entry: Entry = {
    id: newEntryId(),
    occurredAt: input.occurredAt ?? now,
    kind: input.kind,
    domains: input.domains,
    title: input.title,
    body: input.body,
    mood: input.mood,
    payload: input.payload,
    createdAt: now,
    updatedAt: now,
  };
  await db.entries.add(entry);
  return entry;
}

export async function getEntry(id: string): Promise<Entry | undefined> {
  return db.entries.get(id);
}

export async function updateEntry(id: string, input: NewEntryInput): Promise<Entry> {
  const error = validateEntry(input);
  if (error) throw new Error(error);
  const existing = await db.entries.get(id);
  if (!existing) throw new Error('記録が見つかりません');
  const updated: Entry = {
    ...existing,
    occurredAt: input.occurredAt ?? existing.occurredAt,
    kind: input.kind,
    domains: input.domains,
    title: input.title,
    body: input.body,
    mood: input.mood,
    payload: input.payload,
    updatedAt: nowIso(),
  };
  await db.entries.put(updated);
  return updated;
}

export async function listRecentEntries(limit = 100): Promise<Entry[]> {
  return db.entries.orderBy('occurredAt').reverse().limit(limit).toArray();
}

export async function listEntriesByDomain(domain: Domain, limit = 100): Promise<Entry[]> {
  const entries = await db.entries.where('domains').equals(domain).toArray();
  return entries.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, limit);
}

// その月（'YYYY-MM'、ローカルタイムゾーン）のエントリ — つながり画面用
export async function listEntriesForMonth(month: string): Promise<Entry[]> {
  return db.entries.where('occurredAt').startsWith(`${month}-`).reverse().toArray();
}

// 記録シートの metric サジェスト: 直近に使った label/unit の組（entries から導出、別テーブルは作らない）
export async function listMetricPresets(limit = 5): Promise<{ label: string; unit?: string }[]> {
  const metrics = await db.entries
    .where('kind')
    .equals('metric')
    .reverse()
    .sortBy('occurredAt');
  const seen = new Set<string>();
  const presets: { label: string; unit?: string }[] = [];
  for (const e of metrics) {
    if (!e.payload || seen.has(e.payload.label)) continue;
    seen.add(e.payload.label);
    presets.push({ label: e.payload.label, unit: e.payload.unit });
    if (presets.length >= limit) break;
  }
  return presets;
}

// エントリ削除時は参照する links も同一トランザクションで消す（整合性ルール）
export async function deleteEntry(id: string): Promise<void> {
  await db.transaction('rw', db.entries, db.links, async () => {
    await db.links.where('fromEntry').equals(id).delete();
    await db.links.where('toEntry').equals(id).delete();
    await db.entries.delete(id);
  });
}
