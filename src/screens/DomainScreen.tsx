import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useEntriesStore } from '../stores/entriesStore';
import { useFinanceStore } from '../stores/financeStore';
import { useTrainingStore } from '../stores/trainingStore';
import { EntryList } from '../components/EntryList';
import { DOMAINS, DOMAIN_LABELS } from '../types/models';
import type { Domain } from '../types/models';

function FinanceSummarySection() {
  const { status, summary, loadSummary, categoriesStatus, categories, loadCategories } =
    useFinanceStore();
  useEffect(() => {
    // 表示のたびに自動取得（クライアント側でメモリキャッシュ TTL 10分）
    void loadSummary();
    void loadCategories();
  }, [loadSummary, loadCategories]);

  if (status !== 'ok' || !summary) {
    if (status === 'loading') return <p className="caption">取得中</p>;
    return (
      <button
        type="button"
        className="caption retry-link"
        onClick={() => {
          void loadSummary();
          void loadCategories();
        }}
      >
        取得できませんでした（tapで再試行）
      </button>
    );
  }
  return (
    <>
      <div className="card">
        <p className="caption">今月のサマリ（家計アプリから取得）</p>
        <p>収入 {summary.income.toLocaleString()}円</p>
        <p>支出 {summary.expense.toLocaleString()}円</p>
        <p>
          収支 {summary.net >= 0 ? '+' : ''}
          {summary.net.toLocaleString()}円
        </p>
      </div>
      {categoriesStatus === 'ok' && categories && categories.length > 0 && (
        <div className="card">
          <p className="caption">カテゴリ別内訳</p>
          {categories.map((c) => (
            <p key={c.name} className="finance-category-row">
              <span>{c.name}</span>
              <span>{c.amount.toLocaleString()}円</span>
            </p>
          ))}
        </div>
      )}
    </>
  );
}

// 'YYYY-MM-DD' → 'M/D'（一覧の日付表示用）
function shortDate(date: string) {
  const [, m, d] = date.split('-');
  return `${Number(m)}/${Number(d)}`;
}

function TrainingSummarySection() {
  const { status, summary, loadSummary, sessionsStatus, sessions, loadRecentSessions } =
    useTrainingStore();
  useEffect(() => {
    // 表示のたびに自動取得（クライアント側でメモリキャッシュ TTL 10分）
    void loadSummary();
    void loadRecentSessions();
  }, [loadSummary, loadRecentSessions]);

  // 未連携なら何も出さない（空状態は静かに空のまま）
  if (status === 'unconfigured') return null;
  if (status !== 'ok' || !summary) {
    if (status === 'loading' || status === 'idle') return <p className="caption">取得中</p>;
    return (
      <button
        type="button"
        className="caption retry-link"
        onClick={() => {
          void loadSummary();
          void loadRecentSessions();
        }}
      >
        取得できませんでした（tapで再試行）
      </button>
    );
  }
  return (
    <>
      <div className="card">
        <p className="caption">今月のトレーニング（My training から取得）</p>
        <p>{summary.sessions}回 / {summary.totalMinutes}分</p>
      </div>
      {sessionsStatus === 'ok' && sessions && sessions.length > 0 && (
        <div className="card">
          <p className="caption">直近7日のセッション</p>
          {sessions.map((s) => (
            <p key={`${s.date}-${s.title}`} className="training-session-row">
              <span>
                {shortDate(s.date)} {s.title}
              </span>
              <span>{s.minutes}分</span>
            </p>
          ))}
        </div>
      )}
    </>
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
      {d === 'health' && <TrainingSummarySection />}
      <EntryList entries={filtered} />
    </div>
  );
}
