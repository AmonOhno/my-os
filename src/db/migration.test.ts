import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { MyOSDatabase } from './db';

const DB_NAME = 'myos-migration-test';

function openV1() {
  const v1 = new Dexie(DB_NAME);
  v1.version(1).stores({
    entries: 'id, occurredAt, kind, *domains, createdAt',
    links: 'id, fromEntry, toEntry, createdAt',
    reviews: 'id, &month, createdAt',
  });
  return v1;
}

function entry(id: string, domains: string[]) {
  return {
    id,
    occurredAt: '2026-07-01T10:00:00+09:00',
    kind: 'note',
    domains,
    body: 'x',
    createdAt: '2026-07-01T10:00:00+09:00',
    updatedAt: '2026-07-01T10:00:00+09:00',
  };
}

afterEach(async () => {
  await Dexie.delete(DB_NAME);
});

describe('v1 → v2 マイグレーション（領域再編）', () => {
  it('projects が career に付け替わり、既存の career と重複しない', async () => {
    const v1 = openV1();
    await v1.open();
    await v1.table('entries').bulkAdd([
      entry('ent_a', ['projects']),
      entry('ent_b', ['career', 'projects', 'learning']),
      entry('ent_c', ['health']),
    ]);
    v1.close();

    const v2 = new MyOSDatabase(DB_NAME);
    await v2.open();
    expect((await v2.entries.get('ent_a'))?.domains).toEqual(['career']);
    expect((await v2.entries.get('ent_b'))?.domains).toEqual(['career', 'learning']);
    expect((await v2.entries.get('ent_c'))?.domains).toEqual(['health']);
    v2.close();
  });

  it('multiEntry インデックスも移行後の領域を反映する', async () => {
    const v1 = openV1();
    await v1.open();
    await v1.table('entries').add(entry('ent_a', ['projects']));
    v1.close();

    const v2 = new MyOSDatabase(DB_NAME);
    await v2.open();
    expect(await v2.entries.where('domains').equals('career').count()).toBe(1);
    expect(await v2.entries.where('domains').equals('projects').count()).toBe(0);
    v2.close();
  });

  it('projects を含まないエントリの updatedAt は変わらない', async () => {
    const v1 = openV1();
    await v1.open();
    await v1.table('entries').add(entry('ent_c', ['health']));
    v1.close();

    const v2 = new MyOSDatabase(DB_NAME);
    await v2.open();
    expect((await v2.entries.get('ent_c'))?.updatedAt).toBe('2026-07-01T10:00:00+09:00');
    v2.close();
  });
});
