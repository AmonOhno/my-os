import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FinanceError,
  fetchCategories,
  fetchDailyExpense,
  fetchSummary,
  getFinanceConfig,
  setFinanceConfig,
  type FinanceSummary,
} from './client';

const SUMMARY: FinanceSummary = { month: '2026-07', income: 300000, expense: 200000, net: 100000 };

function okResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => body } as Response;
}

beforeEach(() => {
  localStorage.clear();
  setFinanceConfig('', ''); // モジュール内キャッシュもリセットされる
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('setFinanceConfig / getFinanceConfig', () => {
  it('baseUrl の末尾スラッシュと前後空白を除去して保存する', () => {
    setFinanceConfig(' https://api.example.com/ ', ' token123 ');
    expect(getFinanceConfig()).toEqual({
      baseUrl: 'https://api.example.com',
      token: 'token123',
    });
  });

  it('未設定なら空文字を返す', () => {
    expect(getFinanceConfig()).toEqual({ baseUrl: '', token: '' });
  });
});

describe('fetchSummary', () => {
  it('未設定なら unconfigured エラー', async () => {
    await expect(fetchSummary('2026-07')).rejects.toMatchObject({ kind: 'unconfigured' });
  });

  it('Bearer トークン付きで GET しサマリを返す', async () => {
    setFinanceConfig('https://api.example.com', 'tok');
    const fetchMock = vi.fn().mockResolvedValue(okResponse(SUMMARY));
    vi.stubGlobal('fetch', fetchMock);

    const got = await fetchSummary('2026-07');
    expect(got).toEqual(SUMMARY);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/summary?month=2026-07',
      expect.objectContaining({ headers: { Authorization: 'Bearer tok' } }),
    );
  });

  it('同一月はキャッシュから返す（fetch は1回のみ）', async () => {
    setFinanceConfig('https://api.example.com', 'tok');
    const fetchMock = vi.fn().mockResolvedValue(okResponse(SUMMARY));
    vi.stubGlobal('fetch', fetchMock);

    await fetchSummary('2026-07');
    await fetchSummary('2026-07');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('別の月はキャッシュを使わない', async () => {
    setFinanceConfig('https://api.example.com', 'tok');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okResponse(SUMMARY))
      .mockResolvedValueOnce(okResponse({ ...SUMMARY, month: '2026-06' }));
    vi.stubGlobal('fetch', fetchMock);

    await fetchSummary('2026-07');
    const got = await fetchSummary('2026-06');
    expect(got.month).toBe('2026-06');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('401/403 は unauthorized エラー', async () => {
    setFinanceConfig('https://api.example.com', 'tok');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 } as Response));
    await expect(fetchSummary('2026-07')).rejects.toMatchObject({ kind: 'unauthorized' });
  });

  it('5xx は unavailable エラー', async () => {
    setFinanceConfig('https://api.example.com', 'tok');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 } as Response));
    await expect(fetchSummary('2026-07')).rejects.toMatchObject({ kind: 'unavailable' });
  });

  it('ネットワークエラーは unavailable に変換する', async () => {
    setFinanceConfig('https://api.example.com', 'tok');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network')));
    const err = await fetchSummary('2026-07').catch((e) => e);
    expect(err).toBeInstanceOf(FinanceError);
    expect(err.kind).toBe('unavailable');
  });
});

describe('fetchCategories', () => {
  it('カテゴリ配列を返し、同一月はキャッシュから返す', async () => {
    setFinanceConfig('https://api.example.com', 'tok');
    const body = { month: '2026-07', categories: [{ name: '食費', amount: 48200 }] };
    const fetchMock = vi.fn().mockResolvedValue(okResponse(body));
    vi.stubGlobal('fetch', fetchMock);

    const got = await fetchCategories('2026-07');
    expect(got).toEqual(body.categories);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/categories?month=2026-07',
      expect.objectContaining({ headers: { Authorization: 'Bearer tok' } }),
    );

    await fetchCategories('2026-07');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('サマリとカテゴリのキャッシュは混ざらない', async () => {
    setFinanceConfig('https://api.example.com', 'tok');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okResponse(SUMMARY))
      .mockResolvedValueOnce(okResponse({ month: '2026-07', categories: [] }));
    vi.stubGlobal('fetch', fetchMock);

    await fetchSummary('2026-07');
    await fetchCategories('2026-07');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('fetchDailyExpense', () => {
  it('当日1日分を min_amount=0 で GET し、支出（負値）だけを合算して返す', async () => {
    setFinanceConfig('https://api.example.com', 'tok');
    const body = {
      events: [
        { date: '2026-07-05', title: '家賃', amount: -95000 },
        { date: '2026-07-05', title: '昼食', amount: -1200 },
        { date: '2026-07-05', title: '給与', amount: 300000 }, // 収入は合算しない
      ],
    };
    const fetchMock = vi.fn().mockResolvedValue(okResponse(body));
    vi.stubGlobal('fetch', fetchMock);

    const got = await fetchDailyExpense('2026-07-05');
    expect(got).toEqual({ date: '2026-07-05', expense: 96200 });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/events?range=2026-07-05..2026-07-05&min_amount=0',
      expect.objectContaining({ headers: { Authorization: 'Bearer tok' } }),
    );
  });

  it('イベントがなければ支出合計は 0', async () => {
    setFinanceConfig('https://api.example.com', 'tok');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse({ events: [] })));
    const got = await fetchDailyExpense('2026-07-05');
    expect(got).toEqual({ date: '2026-07-05', expense: 0 });
  });

  it('未設定なら unconfigured エラー', async () => {
    await expect(fetchDailyExpense('2026-07-05')).rejects.toMatchObject({
      kind: 'unconfigured',
    });
  });
});
