import { useEffect, useState } from 'react';
import type { Entry } from '../types/models';
import { monthOf } from '../db/time';
import { useConnectionsStore } from '../stores/connectionsStore';
import { MonthSwitcher } from '../components/MonthSwitcher';
import { ConnectionMap } from '../components/ConnectionMap';
import { ReviewCard } from '../components/ReviewCard';

function optionLabel(e: Entry): string {
  const day = `${Number(e.occurredAt.slice(5, 7))}/${Number(e.occurredAt.slice(8, 10))}`;
  const text = e.title ?? e.body ?? e.payload?.label ?? (e.mood != null ? `気分 ${e.mood}` : '');
  return `${day} ${text.slice(0, 12)}`;
}

// この月のエントリどうしをつなぐ導線（マップ下 — docs/feature/connections.md §4）
function LinkForm({ entries }: { entries: Entry[] }) {
  const addLink = useConnectionsStore((s) => s.addLink);
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    try {
      await addLink(fromId, toId, note);
      // 保存成功はマップに線が現れることで伝える（トーストは出さない）
      setFromId('');
      setToId('');
      setNote('');
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'つなげられませんでした');
    }
  };

  return (
    <div className="link-form">
      <p className="caption section-heading">この月のエントリからつなぐ</p>
      <select className="field" value={fromId} onChange={(e) => setFromId(e.target.value)}>
        <option value="">えらぶ</option>
        {entries.map((e) => (
          <option key={e.id} value={e.id}>
            {optionLabel(e)}
          </option>
        ))}
      </select>
      <select className="field" value={toId} onChange={(e) => setToId(e.target.value)}>
        <option value="">えらぶ</option>
        {entries.map((e) => (
          <option key={e.id} value={e.id}>
            {optionLabel(e)}
          </option>
        ))}
      </select>
      <input
        className="field"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="一言メモ（任意）"
      />
      {error && <p className="caption">{error}</p>}
      <button
        type="button"
        className="save-button"
        disabled={!fromId || !toId || fromId === toId}
        onClick={() => void save()}
      >
        つなげる
      </button>
    </div>
  );
}

export function ConnectionsScreen() {
  const [month, setMonth] = useState(() => monthOf());
  const { entries, links, review, loadMonth, saveReview } = useConnectionsStore();

  useEffect(() => {
    void loadMonth(month);
  }, [month, loadMonth]);

  return (
    <div className="screen">
      <h1 className="screen-title">つながり</h1>
      <MonthSwitcher month={month} onChange={setMonth} />
      <ConnectionMap entries={entries} links={links} />
      {entries.length >= 2 && <LinkForm entries={entries} />}
      <ReviewCard month={month} review={review} onSave={saveReview} />
    </div>
  );
}
