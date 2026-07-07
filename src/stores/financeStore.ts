import { create } from 'zustand';
import {
  fetchCategories,
  fetchDailyExpense,
  fetchSummary,
  FinanceError,
  type FinanceCategory,
  type FinanceDailyExpense,
  type FinanceSummary,
} from '../finance/client';
import { dateOf, monthOf } from '../db/time';

export type FinanceStatus = 'idle' | 'loading' | 'ok' | 'unconfigured' | 'unauthorized' | 'error';

function toStatus(e: unknown): FinanceStatus {
  const kind = e instanceof FinanceError ? e.kind : 'unavailable';
  return kind === 'unconfigured' ? 'unconfigured' : kind === 'unauthorized' ? 'unauthorized' : 'error';
}

interface FinanceState {
  status: FinanceStatus;
  summary: FinanceSummary | null;
  categoriesStatus: FinanceStatus;
  categories: FinanceCategory[] | null;
  yesterdayExpense: FinanceDailyExpense | null;
  loadSummary: () => Promise<void>;
  loadCategories: () => Promise<void>;
  loadYesterdayExpense: () => Promise<void>;
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
  status: 'idle',
  summary: null,
  categoriesStatus: 'idle',
  categories: null,
  yesterdayExpense: null,
  loadSummary: async () => {
    if (get().status === 'loading') return;
    set({ status: 'loading' });
    try {
      const summary = await fetchSummary(monthOf());
      set({ status: 'ok', summary });
    } catch (e) {
      // 失敗してもキャッシュ済みサマリがあれば表示し続ける
      set({ status: toStatus(e) });
    }
  },
  loadCategories: async () => {
    if (get().categoriesStatus === 'loading') return;
    set({ categoriesStatus: 'loading' });
    try {
      const categories = await fetchCategories(monthOf());
      set({ categoriesStatus: 'ok', categories });
    } catch (e) {
      set({ categoriesStatus: toStatus(e) });
    }
  },
  loadYesterdayExpense: async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    try {
      const yesterdayExpense = await fetchDailyExpense(dateOf(yesterday));
      set({ yesterdayExpense });
    } catch {
      // 取得できなくてもタイムラインは通常表示（他機能は影響なし）
    }
  },
}));
