// 家計アプリAPIクライアント。GET のみ・金銭データはローカル保存しない
// （docs/feature/finance_integration.md）。トークンは localStorage のみ。

export interface FinanceSummary {
  month: string;
  income: number;
  expense: number;
  net: number;
}

export type FinanceErrorKind = 'unconfigured' | 'unauthorized' | 'unavailable';

export class FinanceError extends Error {
  constructor(public kind: FinanceErrorKind) {
    super(kind);
  }
}

const BASE_URL_KEY = 'myos.finance.baseUrl';
const TOKEN_KEY = 'myos.finance.token';
const TTL_MS = 10 * 60 * 1000; // 直近サマリのみ短時間キャッシュ（メモリ内）
const TIMEOUT_MS = 5000;

let cache: { at: number; summary: FinanceSummary } | null = null;

export function getFinanceConfig() {
  return {
    baseUrl: localStorage.getItem(BASE_URL_KEY) ?? '',
    token: localStorage.getItem(TOKEN_KEY) ?? '',
  };
}

export function setFinanceConfig(baseUrl: string, token: string) {
  localStorage.setItem(BASE_URL_KEY, baseUrl.trim().replace(/\/$/, ''));
  localStorage.setItem(TOKEN_KEY, token.trim());
  cache = null;
}

export async function fetchSummary(month: string): Promise<FinanceSummary> {
  const { baseUrl, token } = getFinanceConfig();
  if (!baseUrl || !token) throw new FinanceError('unconfigured');
  if (cache && cache.summary.month === month && Date.now() - cache.at < TTL_MS) {
    return cache.summary;
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${baseUrl}/api/summary?month=${month}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: ctrl.signal,
    });
    if (res.status === 401 || res.status === 403) throw new FinanceError('unauthorized');
    if (!res.ok) throw new FinanceError('unavailable');
    const summary = (await res.json()) as FinanceSummary;
    cache = { at: Date.now(), summary };
    return summary;
  } catch (e) {
    if (e instanceof FinanceError) throw e;
    throw new FinanceError('unavailable');
  } finally {
    clearTimeout(timer);
  }
}
