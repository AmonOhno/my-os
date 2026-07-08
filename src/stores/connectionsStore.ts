import { create } from 'zustand';
import type { Entry, Link, Review } from '../types/models';
import { listEntriesForMonth } from '../db/repository';
import { createLink, deleteLink, listLinksTouchingEntries } from '../db/linksRepository';
import { getReview, upsertReview } from '../db/reviewsRepository';

interface ConnectionsState {
  month: string; // 'YYYY-MM'
  entries: Entry[]; // その月に occurredAt を持つエントリ
  links: Link[]; // それらに触れるリンク
  review: Review | undefined;
  loaded: boolean;
  loadMonth: (month: string) => Promise<void>;
  addLink: (fromEntry: string, toEntry: string, note?: string) => Promise<void>;
  removeLink: (id: string) => Promise<void>;
  saveReview: (body: string) => Promise<void>;
}

export const useConnectionsStore = create<ConnectionsState>((set, get) => ({
  month: '',
  entries: [],
  links: [],
  review: undefined,
  loaded: false,
  loadMonth: async (month) => {
    const entries = await listEntriesForMonth(month);
    const [links, review] = await Promise.all([
      listLinksTouchingEntries(entries.map((e) => e.id)),
      getReview(month),
    ]);
    set({ month, entries, links, review, loaded: true });
  },
  addLink: async (fromEntry, toEntry, note) => {
    await createLink(fromEntry, toEntry, note);
    // 変更したリソース（links）だけ再読込
    const links = await listLinksTouchingEntries(get().entries.map((e) => e.id));
    set({ links });
  },
  removeLink: async (id) => {
    await deleteLink(id);
    const links = await listLinksTouchingEntries(get().entries.map((e) => e.id));
    set({ links });
  },
  saveReview: async (body) => {
    const review = await upsertReview(get().month, body);
    set({ review });
  },
}));
