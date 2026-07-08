import { describe, expect, it } from 'vitest';
import { dateOf, monthOf, nowIso, shiftMonth } from './time';

describe('nowIso', () => {
  it('ISO 8601 ローカル時刻 + オフセット形式で出力する', () => {
    const iso = nowIso(new Date(2026, 6, 5, 9, 8, 7)); // 2026-07-05 09:08:07 local
    expect(iso).toMatch(/^2026-07-05T09:08:07[+-]\d{2}:\d{2}$/);
  });

  it('月・日・時分秒をゼロ埋めする', () => {
    const iso = nowIso(new Date(2026, 0, 1, 0, 0, 0));
    expect(iso.startsWith('2026-01-01T00:00:00')).toBe(true);
  });

  it('オフセットが端末タイムゾーンと一致する', () => {
    const d = new Date(2026, 6, 5, 12, 0, 0);
    const offsetMin = -d.getTimezoneOffset();
    const sign = offsetMin >= 0 ? '+' : '-';
    const hh = String(Math.floor(Math.abs(offsetMin) / 60)).padStart(2, '0');
    const mm = String(Math.abs(offsetMin) % 60).padStart(2, '0');
    expect(nowIso(d).endsWith(`${sign}${hh}:${mm}`)).toBe(true);
  });

  it('文字列比較でソート可能（同一オフセット内）', () => {
    const a = nowIso(new Date(2026, 6, 5, 9, 0, 0));
    const b = nowIso(new Date(2026, 6, 5, 10, 0, 0));
    expect(a < b).toBe(true);
  });
});

describe('monthOf', () => {
  it("'YYYY-MM' 形式で返す", () => {
    expect(monthOf(new Date(2026, 6, 5))).toBe('2026-07');
  });

  it('1桁の月はゼロ埋めする', () => {
    expect(monthOf(new Date(2026, 0, 15))).toBe('2026-01');
  });

  it('12月も正しく扱う', () => {
    expect(monthOf(new Date(2025, 11, 31))).toBe('2025-12');
  });
});

describe('shiftMonth', () => {
  it('前後の月に移動する', () => {
    expect(shiftMonth('2026-07', -1)).toBe('2026-06');
    expect(shiftMonth('2026-07', 1)).toBe('2026-08');
  });

  it('年をまたぐ', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2025-12', 1)).toBe('2026-01');
  });
});

describe('dateOf', () => {
  it("'YYYY-MM-DD' 形式で返す", () => {
    expect(dateOf(new Date(2026, 6, 5))).toBe('2026-07-05');
  });

  it('1桁の日はゼロ埋めする', () => {
    expect(dateOf(new Date(2026, 0, 1))).toBe('2026-01-01');
  });
});
