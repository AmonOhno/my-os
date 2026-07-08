// ISO 8601 ローカル時刻 + オフセット（docs/database/schema.md §4）
export function nowIso(date: Date = new Date()): string {
  const pad = (n: number, len = 2) => String(Math.abs(n)).padStart(len, '0');
  const offsetMin = -date.getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
    `${sign}${pad(Math.floor(Math.abs(offsetMin) / 60))}:${pad(Math.abs(offsetMin) % 60)}`
  );
}

// 'YYYY-MM'（端末ローカルタイムゾーン基準）
export function monthOf(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// 'YYYY-MM-DD'（端末ローカルタイムゾーン基準）
export function dateOf(date: Date = new Date()): string {
  return `${monthOf(date)}-${String(date.getDate()).padStart(2, '0')}`;
}

// 'YYYY-MM' を delta ヶ月ずらす（月切替用）
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  return monthOf(new Date(y, m - 1 + delta, 1));
}
