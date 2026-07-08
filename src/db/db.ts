import Dexie, { type Table } from 'dexie';
import type { Entry, Link, Review } from '../types/models';

export class MyOSDatabase extends Dexie {
  entries!: Table<Entry, string>;
  links!: Table<Link, string>;
  reviews!: Table<Review, string>;

  // name はマイグレーションテスト用（本体は常に 'myos'）
  constructor(name = 'myos') {
    super(name);
    this.version(1).stores({
      entries: 'id, occurredAt, kind, *domains, createdAt',
      links: 'id, fromEntry, toEntry, createdAt',
      reviews: 'id, &month, createdAt',
    });
    // v2: 領域再編（Projects 廃止 → Career へ付け替え）。updatedAt は本人の編集時刻なので変えない
    this.version(2)
      .stores({
        entries: 'id, occurredAt, kind, *domains, createdAt',
        links: 'id, fromEntry, toEntry, createdAt',
        reviews: 'id, &month, createdAt',
      })
      .upgrade(async (tx) => {
        await tx
          .table<{ domains: string[] }>('entries')
          .toCollection()
          .modify((entry) => {
            if (!entry.domains.includes('projects')) return;
            entry.domains = [
              ...new Set(entry.domains.map((d) => (d === 'projects' ? 'career' : d))),
            ];
          });
      });
  }
}

export const db = new MyOSDatabase();
