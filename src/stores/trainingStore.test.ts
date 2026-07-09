import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTrainingStore } from './trainingStore';
import { setTrainingConfig, type TrainingSummary } from '../training/client';
import { dateOf, monthOf } from '../db/time';

const SUMMARY: TrainingSummary = {
  month: monthOf(),
  sessions: 12,
  totalMinutes: 540,
};

beforeEach(() => {
  localStorage.clear();
  setTrainingConfig('', ''); // クライアント内キャッシュをリセット
  localStorage.clear();
  useTrainingStore.setState({
    status: 'idle',
    summary: null,
    sessionsStatus: 'idle',
    sessions: null,
  });
  vi.unstubAllGlobals();
});

describe('useTrainingStore.loadSummary', () => {
  it('未設定なら unconfigured', async () => {
    await useTrainingStore.getState().loadSummary();
    expect(useTrainingStore.getState().status).toBe('unconfigured');
  });

  it('成功で ok とサマリを保持する', async () => {
    setTrainingConfig('https://api.example.com', 'tok');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => SUMMARY } as Response),
    );
    await useTrainingStore.getState().loadSummary();
    const s = useTrainingStore.getState();
    expect(s.status).toBe('ok');
    expect(s.summary).toEqual(SUMMARY);
  });

  it('401 は unauthorized', async () => {
    setTrainingConfig('https://api.example.com', 'tok');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 } as Response));
    await useTrainingStore.getState().loadSummary();
    expect(useTrainingStore.getState().status).toBe('unauthorized');
  });

  it('5xx は error だが取得済みサマリは保持し続ける', async () => {
    setTrainingConfig('https://api.example.com', 'tok');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => SUMMARY } as Response),
    );
    await useTrainingStore.getState().loadSummary();

    // 設定変更でキャッシュを無効化してから失敗させる
    setTrainingConfig('https://api.example.com', 'tok2');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 } as Response));
    await useTrainingStore.getState().loadSummary();

    const s = useTrainingStore.getState();
    expect(s.status).toBe('error');
    expect(s.summary).toEqual(SUMMARY); // 前回値を表示し続ける
  });

  it('loading 中の再入は無視する', async () => {
    setTrainingConfig('https://api.example.com', 'tok');
    let resolveFetch!: (v: unknown) => void;
    const fetchMock = vi.fn(() => new Promise((resolve) => (resolveFetch = resolve)));
    vi.stubGlobal('fetch', fetchMock);

    const first = useTrainingStore.getState().loadSummary();
    const second = useTrainingStore.getState().loadSummary(); // 即 return
    resolveFetch({ ok: true, status: 200, json: async () => SUMMARY });
    await Promise.all([first, second]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(useTrainingStore.getState().status).toBe('ok');
  });
});

describe('useTrainingStore.loadRecentSessions', () => {
  it('直近7日分を range 指定で取得して保持する', async () => {
    setTrainingConfig('https://api.example.com', 'tok');
    const body = { sessions: [{ date: dateOf(), title: '胸・肩', minutes: 60 }] };
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 200, json: async () => body } as Response);
    vi.stubGlobal('fetch', fetchMock);

    await useTrainingStore.getState().loadRecentSessions();
    const s = useTrainingStore.getState();
    expect(s.sessionsStatus).toBe('ok');
    expect(s.sessions).toEqual(body.sessions);

    const from = new Date();
    from.setDate(from.getDate() - 6);
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toBe(`https://api.example.com/sessions?range=${dateOf(from)}..${dateOf()}`);
  });

  it('未設定なら unconfigured', async () => {
    await useTrainingStore.getState().loadRecentSessions();
    expect(useTrainingStore.getState().sessionsStatus).toBe('unconfigured');
  });

  it('5xx は error（他機能は影響なし）', async () => {
    setTrainingConfig('https://api.example.com', 'tok');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 } as Response));
    await useTrainingStore.getState().loadRecentSessions();
    expect(useTrainingStore.getState().sessionsStatus).toBe('error');
  });
});
