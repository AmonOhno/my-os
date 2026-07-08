import { DomainChip } from './DomainChip';
import type { Entry } from '../types/models';
import type { FinanceDailyExpense } from '../finance/client';

const MOOD_FACES = ['😞', '😕', '😐', '🙂', '😊'];

export function entrySummary(entry: Entry): string {
  switch (entry.kind) {
    case 'metric':
      return `${entry.payload?.label} ${entry.payload?.value}${entry.payload?.unit ?? ''}`;
    case 'event':
      return entry.title ?? '';
    case 'mood':
      return `${MOOD_FACES[(entry.mood ?? 3) - 1]} ${entry.body ?? ''}`.trim();
    default:
      return entry.body ?? '';
  }
}

function dateLabel(isoDate: string): string {
  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  if (isoDate === toKey(today)) return 'きょう';
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (isoDate === toKey(yesterday)) return 'きのう';
  const d = new Date(`${isoDate}T00:00:00`);
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return `${d.getMonth() + 1}月${d.getDate()}日(${days[d.getDay()]})`;
}

// occurredAt 降順前提。日付見出しでグルーピングし、エントリのない日は見出し自体を出さない。
// financeDaily は家計アプリ由来の読み取り専用行（entries には保存しない）。該当日の末尾に混ぜる
export function EntryList({
  entries,
  financeDaily,
}: {
  entries: Entry[];
  financeDaily?: FinanceDailyExpense | null;
}) {
  const byDate = new Map<string, { items: Entry[]; expense: FinanceDailyExpense | null }>();
  const groupOf = (date: string) => {
    let g = byDate.get(date);
    if (!g) {
      g = { items: [], expense: null };
      byDate.set(date, g);
    }
    return g;
  };
  for (const entry of entries) groupOf(entry.occurredAt.slice(0, 10)).items.push(entry);
  if (financeDaily) groupOf(financeDaily.date).expense = financeDaily;
  const dates = [...byDate.keys()].sort((a, b) => (a < b ? 1 : -1));

  return (
    <div className="entry-list">
      {dates.map((date) => {
        const group = byDate.get(date)!;
        return (
          <section key={date}>
            <p className="caption date-heading">{dateLabel(date)}</p>
            <div className="entry-group">
              {group.items.map((entry) => (
                <article key={entry.id} className="card">
                  <p className="caption entry-meta">
                    {entry.domains.map((d) => (
                      <DomainChip key={d} domain={d} />
                    ))}
                    <span>{entry.occurredAt.slice(11, 16)}</span>
                  </p>
                  <p className={entry.kind === 'event' ? 'entry-body entry-event' : 'entry-body'}>
                    {entrySummary(entry)}
                  </p>
                </article>
              ))}
              {group.expense && (
                <article className="card">
                  <p className="caption entry-meta">
                    <DomainChip domain="finance" />
                    <span>家計アプリ</span>
                  </p>
                  <p className="entry-body">支出合計 {group.expense.expense.toLocaleString()}円</p>
                </article>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
