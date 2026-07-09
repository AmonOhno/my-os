// My training APIクライアント。GET のみ・トレーニングデータはローカル保存しない
// （docs/feature/training_integration.md）。トークンは localStorage のみ。
// 実 API は My training 側で用意する読み取り専用エンドポイント（finance 連携と同型）。
// ベースURLとトークンは設定画面で登録する。

export interface TrainingSummary {
  month: string;
  sessions: number; // 実施回数
  totalMinutes: number; // 合計時間（分）
}

export interface TrainingSession {
  date: string; // YYYY-MM-DD
  title: string; // 例: '胸・肩'
  minutes: number;
}

export type TrainingErrorKind = 'unconfigured' | 'unauthorized' | 'unavailable';

export class TrainingError extends Error {
  constructor(public kind: TrainingErrorKind) {
    super(kind);
  }
}

const BASE_URL_KEY = 'myos.training.baseUrl';
const TOKEN_KEY = 'myos.training.token';
const TTL_MS = 10 * 60 * 1000; // 短時間キャッシュ（メモリ内のみ・保存しない）
const TIMEOUT_MS = 5000;

const cache = new Map<string, { at: number; body: unknown }>();

export function getTrainingConfig() {
  return {
    baseUrl: localStorage.getItem(BASE_URL_KEY) ?? '',
    token: localStorage.getItem(TOKEN_KEY) ?? '',
  };
}

export function setTrainingConfig(baseUrl: string, token: string) {
  localStorage.setItem(BASE_URL_KEY, baseUrl.trim().replace(/\/$/, ''));
  localStorage.setItem(TOKEN_KEY, token.trim());
  cache.clear();
}

async function getJson<T>(path: string): Promise<T> {
  const { baseUrl, token } = getTrainingConfig();
  if (!baseUrl || !token) throw new TrainingError('unconfigured');
  const url = `${baseUrl}${path}`;
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.body as T;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: ctrl.signal,
    });
    if (res.status === 401 || res.status === 403) throw new TrainingError('unauthorized');
    if (!res.ok) throw new TrainingError('unavailable');
    const body = (await res.json()) as T;
    cache.set(url, { at: Date.now(), body });
    return body;
  } catch (e) {
    if (e instanceof TrainingError) throw e;
    throw new TrainingError('unavailable');
  } finally {
    clearTimeout(timer);
  }
}

export function fetchTrainingSummary(month: string): Promise<TrainingSummary> {
  return getJson<TrainingSummary>(`/summary?month=${month}`);
}

// 期間内のセッション一覧。表示用に日付の新しい順で返す
export async function fetchSessions(from: string, to: string): Promise<TrainingSession[]> {
  const body = await getJson<{ sessions: TrainingSession[] }>(`/sessions?range=${from}..${to}`);
  return [...body.sessions].sort((a, b) => (a.date < b.date ? 1 : -1));
}
