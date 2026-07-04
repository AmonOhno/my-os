import { create } from 'zustand';
import { fetchSummary, FinanceError, type FinanceSummary } from '../finance/client';
import { monthOf } from '../db/time';

export type FinanceStatus = 'idle' | 'loading' | 'ok' | 'unconfigured' | 'unauthorized' | 'error';

interface FinanceState {
  status: FinanceStatus;
  summary: FinanceSummary | null;
  loadSummary: () => Promise<void>;
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
  status: 'idle',
  summary: null,
  loadSummary: async () => {
    if (get().status === 'loading') return;
    set({ status: 'loading' });
    try {
      const summary = await fetchSummary(monthOf());
      set({ status: 'ok', summary });
    } catch (e) {
      const kind = e instanceof FinanceError ? e.kind : 'unavailable';
      // 失敗してもキャッシュ済みサマリがあれば表示し続ける
      set({
        status: kind === 'unconfigured' ? 'unconfigured' : kind === 'unauthorized' ? 'unauthorized' : 'error',
      });
    }
  },
}));
