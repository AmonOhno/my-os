import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db/db';
import { useEntriesStore } from './entriesStore';

beforeEach(async () => {
  await Promise.all([db.entries.clear(), db.links.clear()]);
  useEntriesStore.setState({ entries: [], loaded: false });
});

describe('useEntriesStore', () => {
  it('loadEntries でDBから読み込み loaded になる', async () => {
    await useEntriesStore.getState().addEntry({ kind: 'note', domains: ['health'], body: 'x' });
    useEntriesStore.setState({ entries: [], loaded: false });

    await useEntriesStore.getState().loadEntries();
    const s = useEntriesStore.getState();
    expect(s.loaded).toBe(true);
    expect(s.entries).toHaveLength(1);
  });

  it('addEntry は保存後に一覧を更新する', async () => {
    await useEntriesStore.getState().addEntry({ kind: 'note', domains: ['health'], body: 'a' });
    await useEntriesStore.getState().addEntry({ kind: 'mood', domains: ['mental'], mood: 4 });
    expect(useEntriesStore.getState().entries).toHaveLength(2);
  });

  it('バリデーションエラーは伝播し一覧は変わらない', async () => {
    await expect(
      useEntriesStore.getState().addEntry({ kind: 'note', domains: [], body: 'x' }),
    ).rejects.toThrow();
    expect(useEntriesStore.getState().entries).toHaveLength(0);
  });

  it('removeEntry は削除後に一覧を更新する', async () => {
    await useEntriesStore.getState().addEntry({ kind: 'note', domains: ['health'], body: 'a' });
    const id = useEntriesStore.getState().entries[0].id;
    await useEntriesStore.getState().removeEntry(id);
    expect(useEntriesStore.getState().entries).toHaveLength(0);
  });
});
