import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useEntriesStore } from '../stores/entriesStore';
import { useFinanceStore } from '../stores/financeStore';
import { StatusCards } from '../components/StatusCards';
import { EntryList } from '../components/EntryList';

function greeting(hour: number): string {
  if (hour < 11) return 'おはよう。';
  if (hour < 18) return 'こんにちは。';
  return 'こんばんは。';
}

function formatDate(d: Date): string {
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return `${d.getMonth() + 1}月${d.getDate()}日(${days[d.getDay()]})`;
}

export function TodayScreen() {
  const { entries, loadEntries } = useEntriesStore();
  const { yesterdayExpense, loadYesterdayExpense } = useFinanceStore();
  useEffect(() => {
    void loadEntries();
    void loadYesterdayExpense(); // きのうの支出合計を自動取得（読み取りのみ・保存しない）
  }, [loadEntries, loadYesterdayExpense]);

  const now = new Date();

  return (
    <div className="screen">
      <header className="today-header">
        <div>
          <p className="caption">{formatDate(now)}</p>
          <h1 className="screen-title">{greeting(now.getHours())}</h1>
        </div>
        <Link to="/settings" className="icon-link" aria-label="設定">
          ⚙︎
        </Link>
      </header>

      <StatusCards entries={entries} />

      {(entries.length > 0 || yesterdayExpense) && (
        <>
          <p className="caption section-heading">タイムライン</p>
          <EntryList entries={entries} financeDaily={yesterdayExpense} />
        </>
      )}
      {/* 空のときは静かに空のまま（催促文言は出さない） */}
    </div>
  );
}
