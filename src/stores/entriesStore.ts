import { create } from 'zustand';
import type { Entry } from '../types/models';
import { listRecentEntries, saveEntry, deleteEntry, type NewEntryInput } from '../db/repository';

interface EntriesState {
  entries: Entry[];
  loaded: boolean;
  loadEntries: () => Promise<void>;
  addEntry: (input: NewEntryInput) => Promise<void>;
  removeEntry: (id: string) => Promise<void>;
}

export const useEntriesStore = create<EntriesState>((set) => ({
  entries: [],
  loaded: false,
  loadEntries: async () => {
    const entries = await listRecentEntries();
    set({ entries, loaded: true });
  },
  addEntry: async (input) => {
    await saveEntry(input);
    // 変更したリソースだけ再読込（全データ再取得はしない）
    const entries = await listRecentEntries();
    set({ entries });
  },
  removeEntry: async (id) => {
    await deleteEntry(id);
    const entries = await listRecentEntries();
    set({ entries });
  },
}));
