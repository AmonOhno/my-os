import { db } from './db';
import { nowIso } from './time';
import type { Entry, Link, Review } from '../types/models';

// docs/database/schema.md §5。Finance トークン等の設定値は含めない
const SCHEMA_VERSION = 1;

export interface ExportData {
  app: 'myos';
  schemaVersion: number;
  exportedAt: string;
  entries: Entry[];
  links: Link[];
  reviews: Review[];
}

export async function exportData(): Promise<ExportData> {
  const [entries, links, reviews] = await Promise.all([
    db.entries.toArray(),
    db.links.toArray(),
    db.reviews.toArray(),
  ]);
  return { app: 'myos', schemaVersion: SCHEMA_VERSION, exportedAt: nowIso(), entries, links, reviews };
}

export function exportFileName(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `myos-export-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}.json`;
}

function parseExport(raw: unknown): ExportData {
  if (typeof raw !== 'object' || raw === null) throw new Error('読み込めないファイルです');
  const data = raw as Partial<ExportData>;
  if (data.app !== 'myos') throw new Error('MyOS のエクスポートファイルではありません');
  if (typeof data.schemaVersion !== 'number' || data.schemaVersion > SCHEMA_VERSION)
    throw new Error('新しいバージョンのデータです。アプリを更新してください');
  // schemaVersion < 1 は存在しない。将来版はここに変換処理を足す
  if (!Array.isArray(data.entries) || !Array.isArray(data.links) || !Array.isArray(data.reviews))
    throw new Error('読み込めないファイルです');
  return data as ExportData;
}

// 全置換のみ（マージはしない）。呼び出し側で確認ダイアログと現行データの自動エクスポートを行うこと
export async function importData(
  raw: unknown,
): Promise<{ entries: number; links: number; reviews: number }> {
  const data = parseExport(raw);
  await db.transaction('rw', db.entries, db.links, db.reviews, async () => {
    await Promise.all([db.entries.clear(), db.links.clear(), db.reviews.clear()]);
    await db.entries.bulkAdd(data.entries);
    await db.links.bulkAdd(data.links);
    await db.reviews.bulkAdd(data.reviews);
  });
  return { entries: data.entries.length, links: data.links.length, reviews: data.reviews.length };
}
