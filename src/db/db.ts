import Dexie, { type Table } from 'dexie';
import type { Entry, Link, Review } from '../types/models';

export class MyOSDatabase extends Dexie {
  entries!: Table<Entry, string>;
  links!: Table<Link, string>;
  reviews!: Table<Review, string>;

  constructor() {
    super('myos');
    this.version(1).stores({
      entries: 'id, occurredAt, kind, *domains, createdAt',
      links: 'id, fromEntry, toEntry, createdAt',
      reviews: 'id, &month, createdAt',
    });
  }
}

export const db = new MyOSDatabase();
