import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useFinanceStore } from './financeStore';
import { setFinanceConfig, type FinanceSummary } from '../finance/client';
import { dateOf, monthOf } from '../db/time';

const SUMMARY: FinanceSummary = {
  month: monthOf(),
  income: 300000,
  expense: 200000,
  net: 100000,
};

beforeEach(() => {
  localStorage.clear();
  setFinanceConfig('', ''); // クライアント内キャッシュをリセット
  localStorage.clear();
  useFinanceStore.setState({
    status: 'idle',
    summary: null,
    categoriesStatus: 'idle',
    categories: null,
    yesterdayExpense: null,
  });
  vi.unstubAllGlobals();
});

describe('useFinanceStore.loadSummary', () => {
  it('未設定なら unconfigured', async () => {
    await useFinanceStore.getState().loadSummary();
    expect(useFinanceStore.getState().status).toBe('unconfigured');
  });

  it('成功で ok とサマリを保持する', async () => {
    setFinanceConfig('https://api.example.com', 'tok');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => SUMMARY } as Response),
    );
    await useFinanceStore.getState().loadSummary();
    const s = useFinanceStore.getState();
    expect(s.status).toBe('ok');
    expect(s.summary).toEqual(SUMMARY);
  });

  it('401 は unauthorized', async () => {
    setFinanceConfig('https://api.example.com', 'tok');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 } as Response));
    await useFinanceStore.getState().loadSummary();
    expect(useFinanceStore.getState().status).toBe('unauthorized');
  });

  it('5xx は error だが取得済みサマリは保持し続ける', async () => {
    setFinanceConfig('https://api.example.com', 'tok');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => SUMMARY } as Response),
    );
    await useFinanceStore.getState().loadSummary();

    // 設定変更でキャッシュを無効化してから失敗させる
    setFinanceConfig('https://api.example.com', 'tok2');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 } as Response));
    await useFinanceStore.getState().loadSummary();

    const s = useFinanceStore.getState();
    expect(s.status).toBe('error');
    expect(s.summary).toEqual(SUMMARY); // 前回値を表示し続ける
  });

  it('loading 中の再入は無視する', async () => {
    setFinanceConfig('https://api.example.com', 'tok');
    let resolveFetch!: (v: unknown) => void;
    const fetchMock = vi.fn(
      () => new Promise((resolve) => (resolveFetch = resolve)),
    );
    vi.stubGlobal('fetch', fetchMock);

    const first = useFinanceStore.getState().loadSummary();
    const second = useFinanceStore.getState().loadSummary(); // 即 return
    resolveFetch({ ok: true, status: 200, json: async () => SUMMARY });
    await Promise.all([first, second]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(useFinanceStore.getState().status).toBe('ok');
  });
});

describe('useFinanceStore.loadCategories', () => {
  it('成功で ok とカテゴリを保持する', async () => {
    setFinanceConfig('https://api.example.com', 'tok');
    const body = { month: monthOf(), categories: [{ name: '食費', amount: 48200 }] };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => body } as Response),
    );
    await useFinanceStore.getState().loadCategories();
    const s = useFinanceStore.getState();
    expect(s.categoriesStatus).toBe('ok');
    expect(s.categories).toEqual(body.categories);
  });

  it('未設定なら unconfigured', async () => {
    await useFinanceStore.getState().loadCategories();
    expect(useFinanceStore.getState().categoriesStatus).toBe('unconfigured');
  });
});

describe('useFinanceStore.loadYesterdayExpense', () => {
  it('きのう1日分の支出合計を取得して保持する', async () => {
    setFinanceConfig('https://api.example.com', 'tok');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const body = { events: [{ date: dateOf(yesterday), title: '家賃', amount: -95000 }] };
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 200, json: async () => body } as Response);
    vi.stubGlobal('fetch', fetchMock);

    await useFinanceStore.getState().loadYesterdayExpense();
    expect(useFinanceStore.getState().yesterdayExpense).toEqual({
      date: dateOf(yesterday),
      expense: 95000,
    });
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toBe(
      `https://api.example.com/events?range=${dateOf(yesterday)}..${dateOf(yesterday)}&min_amount=0`,
    );
  });

  it('失敗しても yesterdayExpense は null のまま（タイムラインは通常表示）', async () => {
    setFinanceConfig('https://api.example.com', 'tok');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 } as Response));
    await useFinanceStore.getState().loadYesterdayExpense();
    expect(useFinanceStore.getState().yesterdayExpense).toBeNull();
  });
});
