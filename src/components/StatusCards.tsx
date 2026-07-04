import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinanceStore } from '../stores/financeStore';
import { entrySummary } from './EntryList';
import { DOMAIN_LABELS } from '../types/models';
import type { Domain, Entry } from '../types/models';

function FinanceCard() {
  const { status, summary, loadSummary } = useFinanceStore();
  const navigate = useNavigate();
  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  let main = '';
  let sub = '';
  switch (status) {
    case 'ok':
      main = `今月 ${summary!.net >= 0 ? '+' : ''}${summary!.net.toLocaleString()}円`;
      sub = '家計アプリから取得';
      break;
    case 'unconfigured':
      main = '未連携';
      sub = '設定から連携できます';
      break;
    case 'unauthorized':
      main = '—';
      sub = 'トークンを確認してください';
      break;
    case 'error':
      main = '—';
      sub = '取得できませんでした';
      break;
    default:
      main = '…';
      sub = '取得中';
  }

  return (
    <button
      type="button"
      className="status-card"
      style={{ '--chip-color': 'var(--domain-finance)' } as React.CSSProperties}
      onClick={() => navigate(status === 'unconfigured' ? '/settings' : '/domain/finance')}
    >
      <span className="status-domain">Finance</span>
      <span className="status-main">{main}</span>
      <span className="caption">{sub}</span>
    </button>
  );
}

// 直近のエントリがある領域のみカードを出す（空の領域は責めない）。Finance は2番目に固定
export function StatusCards({ entries }: { entries: Entry[] }) {
  const navigate = useNavigate();
  const latestByDomain = new Map<Domain, Entry>();
  for (const entry of entries) {
    for (const d of entry.domains) {
      if (d !== 'finance' && !latestByDomain.has(d)) latestByDomain.set(d, entry);
    }
  }
  const domains = [...latestByDomain.keys()];

  const cards = domains.map((domain) => {
    const entry = latestByDomain.get(domain)!;
    return (
      <button
        key={domain}
        type="button"
        className="status-card"
        style={{ '--chip-color': `var(--domain-${domain})` } as React.CSSProperties}
        onClick={() => navigate(`/domain/${domain}`)}
      >
        <span className="status-domain">{DOMAIN_LABELS[domain]}</span>
        <span className="status-main">{entrySummary(entry)}</span>
        <span className="caption">{entry.occurredAt.slice(5, 10).replace('-', '/')}</span>
      </button>
    );
  });
  cards.splice(Math.min(1, cards.length), 0, <FinanceCard key="finance" />);

  return <div className="status-row">{cards}</div>;
}
