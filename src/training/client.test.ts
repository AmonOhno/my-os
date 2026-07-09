import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  TrainingError,
  fetchSessions,
  fetchTrainingSummary,
  getTrainingConfig,
  setTrainingConfig,
  type TrainingSummary,
} from './client';

const SUMMARY: TrainingSummary = { month: '2026-07', sessions: 12, totalMinutes: 540 };

function okResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => body } as Response;
}

beforeEach(() => {
  localStorage.clear();
  setTrainingConfig('', ''); // モジュール内キャッシュもリセットされる
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('setTrainingConfig / getTrainingConfig', () => {
  it('baseUrl の末尾スラッシュと前後空白を除去して保存する', () => {
    setTrainingConfig(' https://api.example.com/ ', ' token123 ');
    expect(getTrainingConfig()).toEqual({
      baseUrl: 'https://api.example.com',
      token: 'token123',
    });
  });

  it('未設定なら空文字を返す', () => {
    expect(getTrainingConfig()).toEqual({ baseUrl: '', token: '' });
  });
});

describe('fetchTrainingSummary', () => {
  it('未設定なら unconfigured エラー', async () => {
    await expect(fetchTrainingSummary('2026-07')).rejects.toMatchObject({ kind: 'unconfigured' });
  });

  it('Bearer トークン付きで GET しサマリを返す', async () => {
    setTrainingConfig('https://api.example.com', 'tok');
    const fetchMock = vi.fn().mockResolvedValue(okResponse(SUMMARY));
    vi.stubGlobal('fetch', fetchMock);

    const got = await fetchTrainingSummary('2026-07');
    expect(got).toEqual(SUMMARY);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/summary?month=2026-07',
      expect.objectContaining({ headers: { Authorization: 'Bearer tok' } }),
    );
  });

  it('同一月はキャッシュから返す（fetch は1回のみ）', async () => {
    setTrainingConfig('https://api.example.com', 'tok');
    const fetchMock = vi.fn().mockResolvedValue(okResponse(SUMMARY));
    vi.stubGlobal('fetch', fetchMock);

    await fetchTrainingSummary('2026-07');
    await fetchTrainingSummary('2026-07');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('401/403 は unauthorized エラー', async () => {
    setTrainingConfig('https://api.example.com', 'tok');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 } as Response));
    await expect(fetchTrainingSummary('2026-07')).rejects.toMatchObject({ kind: 'unauthorized' });
  });

  it('5xx は unavailable エラー', async () => {
    setTrainingConfig('https://api.example.com', 'tok');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 } as Response));
    await expect(fetchTrainingSummary('2026-07')).rejects.toMatchObject({ kind: 'unavailable' });
  });

  it('ネットワークエラーは unavailable に変換する', async () => {
    setTrainingConfig('https://api.example.com', 'tok');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network')));
    const err = await fetchTrainingSummary('2026-07').catch((e) => e);
    expect(err).toBeInstanceOf(TrainingError);
    expect(err.kind).toBe('unavailable');
  });
});

describe('fetchSessions', () => {
  it('range 指定で GET し、日付の新しい順で返す', async () => {
    setTrainingConfig('https://api.example.com', 'tok');
    const body = {
      sessions: [
        { date: '2026-07-03', title: '脚', minutes: 45 },
        { date: '2026-07-05', title: '胸・肩', minutes: 60 },
      ],
    };
    const fetchMock = vi.fn().mockResolvedValue(okResponse(body));
    vi.stubGlobal('fetch', fetchMock);

    const got = await fetchSessions('2026-07-01', '2026-07-07');
    expect(got.map((s) => s.date)).toEqual(['2026-07-05', '2026-07-03']);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/sessions?range=2026-07-01..2026-07-07',
      expect.objectContaining({ headers: { Authorization: 'Bearer tok' } }),
    );
  });

  it('サマリとセッションのキャッシュは混ざらない', async () => {
    setTrainingConfig('https://api.example.com', 'tok');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okResponse(SUMMARY))
      .mockResolvedValueOnce(okResponse({ sessions: [] }));
    vi.stubGlobal('fetch', fetchMock);

    await fetchTrainingSummary('2026-07');
    await fetchSessions('2026-07-01', '2026-07-07');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('未設定なら unconfigured エラー', async () => {
    await expect(fetchSessions('2026-07-01', '2026-07-07')).rejects.toMatchObject({
      kind: 'unconfigured',
    });
  });
});
