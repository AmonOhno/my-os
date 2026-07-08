import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db/db';
import { saveEntry } from '../db/repository';
import { useConnectionsStore } from './connectionsStore';

const MONTH = '2026-07';

function reset() {
  useConnectionsStore.setState({
    month: '',
    entries: [],
    links: [],
    review: undefined,
    loaded: false,
  });
}

async function seedEntry(body: string, occurredAt = `${MONTH}-08T10:00:00+09:00`) {
  return saveEntry({ kind: 'note', domains: ['health'], body, occurredAt });
}

beforeEach(async () => {
  await Promise.all([db.entries.clear(), db.links.clear(), db.reviews.clear()]);
  reset();
});

describe('useConnectionsStore', () => {
  it('loadMonth でその月のエントリ・リンク・ふりかえりを読み込む', async () => {
    const a = await seedEntry('a');
    const b = await seedEntry('b');
    await seedEntry('先月', '2026-06-30T10:00:00+09:00');

    await useConnectionsStore.getState().loadMonth(MONTH);
    await useConnectionsStore.getState().addLink(a.id, b.id, '関係ありそう');
    await useConnectionsStore.getState().loadMonth(MONTH);

    const s = useConnectionsStore.getState();
    expect(s.loaded).toBe(true);
    expect(s.month).toBe(MONTH);
    expect(s.entries).toHaveLength(2);
    expect(s.links).toHaveLength(1);
    expect(s.review).toBeUndefined();
  });

  it('addLink は保存後に links だけ再読込する', async () => {
    const a = await seedEntry('a');
    const b = await seedEntry('b');
    await useConnectionsStore.getState().loadMonth(MONTH);

    await useConnectionsStore.getState().addLink(a.id, b.id);
    expect(useConnectionsStore.getState().links).toHaveLength(1);
  });

  it('重複リンクのエラーは伝播し links は変わらない', async () => {
    const a = await seedEntry('a');
    const b = await seedEntry('b');
    await useConnectionsStore.getState().loadMonth(MONTH);
    await useConnectionsStore.getState().addLink(a.id, b.id);

    await expect(useConnectionsStore.getState().addLink(b.id, a.id)).rejects.toThrow();
    expect(useConnectionsStore.getState().links).toHaveLength(1);
  });

  it('removeLink は削除後に links を再読込する', async () => {
    const a = await seedEntry('a');
    const b = await seedEntry('b');
    await useConnectionsStore.getState().loadMonth(MONTH);
    await useConnectionsStore.getState().addLink(a.id, b.id);
    const id = useConnectionsStore.getState().links[0].id;

    await useConnectionsStore.getState().removeLink(id);
    expect(useConnectionsStore.getState().links).toHaveLength(0);
  });

  it('saveReview はその月のふりかえりを upsert する', async () => {
    await useConnectionsStore.getState().loadMonth(MONTH);

    await useConnectionsStore.getState().saveReview('気づきメモ');
    expect(useConnectionsStore.getState().review?.body).toBe('気づきメモ');

    await useConnectionsStore.getState().saveReview('書き直し');
    const s = useConnectionsStore.getState();
    expect(s.review?.body).toBe('書き直し');
    expect(await db.reviews.count()).toBe(1);
  });
});
