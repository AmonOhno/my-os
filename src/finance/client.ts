// 家計アプリAPIクライアント。GET のみ・金銭データはローカル保存しない
// （docs/feature/finance_integration.md）。トークンは localStorage のみ。
// 実 API は asset-simulator の Supabase Edge Function。
// ベースURL: https://<project-ref>.supabase.co/functions/v1/myos
// （仕様: asset-simulator/docs/api/myos_integration.md）

export interface FinanceSummary {
  month: string;
  income: number;
  expense: number;
  net: number;
}

export interface FinanceCategory {
  name: string;
  amount: number;
}

interface FinanceEvent {
  date: string;
  title: string;
  amount: number; // 支出は負値で返る
}

export interface FinanceDailyExpense {
  date: string;
  expense: number; // 支出合計（正値）
}

export type FinanceErrorKind = 'unconfigured' | 'unauthorized' | 'unavailable';

export class FinanceError extends Error {
  constructor(public kind: FinanceErrorKind) {
    super(kind);
  }
}

const BASE_URL_KEY = 'myos.finance.baseUrl';
const TOKEN_KEY = 'myos.finance.token';
const TTL_MS = 10 * 60 * 1000; // 短時間キャッシュ（メモリ内のみ・保存しない）
const TIMEOUT_MS = 5000;

const cache = new Map<string, { at: number; body: unknown }>();

export function getFinanceConfig() {
  return {
    baseUrl: localStorage.getItem(BASE_URL_KEY) ?? '',
    token: localStorage.getItem(TOKEN_KEY) ?? '',
  };
}

export function setFinanceConfig(baseUrl: string, token: string) {
  localStorage.setItem(BASE_URL_KEY, baseUrl.trim().replace(/\/$/, ''));
  localStorage.setItem(TOKEN_KEY, token.trim());
  cache.clear();
}

async function getJson<T>(path: string): Promise<T> {
  const { baseUrl, token } = getFinanceConfig();
  if (!baseUrl || !token) throw new FinanceError('unconfigured');
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
    if (res.status === 401 || res.status === 403) throw new FinanceError('unauthorized');
    if (!res.ok) throw new FinanceError('unavailable');
    const body = (await res.json()) as T;
    cache.set(url, { at: Date.now(), body });
    return body;
  } catch (e) {
    if (e instanceof FinanceError) throw e;
    throw new FinanceError('unavailable');
  } finally {
    clearTimeout(timer);
  }
}

export function fetchSummary(month: string): Promise<FinanceSummary> {
  return getJson<FinanceSummary>(`/summary?month=${month}`);
}

export async function fetchCategories(month: string): Promise<FinanceCategory[]> {
  const body = await getJson<{ month: string; categories: FinanceCategory[] }>(
    `/categories?month=${month}`,
  );
  return body.categories;
}

// 指定日の全イベントを取得し、支出（負値）だけを合算して返す。
// API に日次合計のエンドポイントはないため、クライアント側で合算する
export async function fetchDailyExpense(date: string): Promise<FinanceDailyExpense> {
  const body = await getJson<{ events: FinanceEvent[] }>(
    `/events?range=${date}..${date}&min_amount=0`,
  );
  const expense = body.events.reduce((sum, e) => (e.amount < 0 ? sum - e.amount : sum), 0);
  return { date, expense };
}
