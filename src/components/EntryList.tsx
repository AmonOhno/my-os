import { DomainChip } from './DomainChip';
import type { Entry } from '../types/models';

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

// occurredAt 降順前提。日付見出しでグルーピングし、エントリのない日は見出し自体を出さない
export function EntryList({ entries }: { entries: Entry[] }) {
  const groups: { date: string; items: Entry[] }[] = [];
  for (const entry of entries) {
    const date = entry.occurredAt.slice(0, 10);
    const last = groups[groups.length - 1];
    if (last && last.date === date) last.items.push(entry);
    else groups.push({ date, items: [entry] });
  }

  return (
    <div className="entry-list">
      {groups.map((group) => (
        <section key={group.date}>
          <p className="caption date-heading">{dateLabel(group.date)}</p>
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
          </div>
        </section>
      ))}
    </div>
  );
}
