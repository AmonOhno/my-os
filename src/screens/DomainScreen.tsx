import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useEntriesStore } from '../stores/entriesStore';
import { useFinanceStore } from '../stores/financeStore';
import { EntryList } from '../components/EntryList';
import { DOMAINS, DOMAIN_LABELS } from '../types/models';
import type { Domain } from '../types/models';

function FinanceSummarySection() {
  const { status, summary, loadSummary } = useFinanceStore();
  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  if (status !== 'ok' || !summary) {
    return <p className="caption">{status === 'loading' ? '取得中' : '取得できませんでした'}</p>;
  }
  return (
    <div className="card">
      <p className="caption">今月のサマリ（家計アプリから取得）</p>
      <p>収入 {summary.income.toLocaleString()}円</p>
      <p>支出 {summary.expense.toLocaleString()}円</p>
      <p>
        収支 {summary.net >= 0 ? '+' : ''}
        {summary.net.toLocaleString()}円
      </p>
    </div>
  );
}

export function DomainScreen() {
  const { domain } = useParams();
  const { entries, loadEntries } = useEntriesStore();
  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  if (!domain || !DOMAINS.includes(domain as Domain)) return null;
  const d = domain as Domain;
  const filtered = entries.filter((e) => e.domains.includes(d));

  return (
    <div className="screen">
      <p>
        <Link to="/" className="back-link">
          ‹ きょう
        </Link>
      </p>
      <h1 className="screen-title" style={{ color: `var(--domain-${d})` }}>
        {DOMAIN_LABELS[d]}
      </h1>
      {d === 'finance' && <FinanceSummarySection />}
      <EntryList entries={filtered} />
    </div>
  );
}
