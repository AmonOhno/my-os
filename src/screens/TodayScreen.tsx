import { useEffect } from 'react';
import { useEntriesStore } from '../stores/entriesStore';
import { DomainChip } from '../components/DomainChip';
import type { Entry } from '../types/models';

function greeting(hour: number): string {
  if (hour < 11) return 'おはよう。';
  if (hour < 18) return 'こんにちは。';
  return 'こんばんは。';
}

function formatDate(d: Date): string {
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return `${d.getMonth() + 1}月${d.getDate()}日(${days[d.getDay()]})`;
}

function entrySummary(entry: Entry): string {
  switch (entry.kind) {
    case 'metric':
      return `${entry.payload?.label} ${entry.payload?.value}${entry.payload?.unit ?? ''}`;
    case 'event':
      return entry.title ?? '';
    default:
      return entry.body ?? '';
  }
}

export function TodayScreen() {
  const { entries, loadEntries } = useEntriesStore();
  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  const now = new Date();

  return (
    <div className="screen">
      <p className="caption">{formatDate(now)}</p>
      <h1 className="screen-title">{greeting(now.getHours())}</h1>

      {/* TODO: 領域の状態カード（横スクロール）— docs/feature/today.md §3 */}

      {entries.length > 0 && (
        <>
          <p className="caption">タイムライン</p>
          <div style={{ display: 'grid', gap: 'calc(var(--space-unit) * 3)' }}>
            {entries.map((entry) => (
              <article key={entry.id} className="card">
                <p className="caption">
                  {entry.domains.map((d) => (
                    <DomainChip key={d} domain={d} />
                  ))}{' '}
                  {entry.occurredAt.slice(11, 16)}
                </p>
                <p style={{ margin: 'calc(var(--space-unit) * 2) 0 0' }}>{entrySummary(entry)}</p>
              </article>
            ))}
          </div>
        </>
      )}
      {/* 空のときは静かに空のまま（催促文言は出さない） */}
    </div>
  );
}
