import { useState } from 'react';
import { useEntriesStore } from '../stores/entriesStore';
import { DOMAINS, DOMAIN_LABELS } from '../types/models';
import type { Domain, EntryKind, Mood } from '../types/models';

const KIND_LABELS: Record<EntryKind, string> = {
  note: 'メモ',
  mood: '気分',
  metric: '数値',
  event: '出来事',
};

const MOODS: Mood[] = [1, 2, 3, 4, 5];

export function RecordSheet({ onClose }: { onClose: () => void }) {
  const addEntry = useEntriesStore((s) => s.addEntry);
  const [kind, setKind] = useState<EntryKind>('note');
  const [domains, setDomains] = useState<Domain[]>([]);
  const [body, setBody] = useState('');
  const [title, setTitle] = useState('');
  const [mood, setMood] = useState<Mood | null>(null);
  const [label, setLabel] = useState('');
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState('');
  const [error, setError] = useState<string | null>(null);

  const toggleDomain = (d: Domain) =>
    setDomains((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  const canSave =
    domains.length > 0 &&
    ((kind === 'note' && body.trim() !== '') ||
      (kind === 'mood' && mood != null) ||
      (kind === 'metric' && label.trim() !== '' && value.trim() !== '' && Number.isFinite(Number(value))) ||
      (kind === 'event' && title.trim() !== ''));

  const save = async () => {
    try {
      await addEntry({
        kind,
        domains,
        body: body.trim() || undefined,
        title: kind === 'event' ? title.trim() : undefined,
        mood: kind === 'mood' ? (mood ?? undefined) : undefined,
        payload:
          kind === 'metric'
            ? { label: label.trim(), value: Number(value), unit: unit.trim() || undefined }
            : undefined,
      });
      onClose();
    } catch (e) {
      // 保存失敗時はシートを閉じず入力を保持する
      setError(e instanceof Error ? e.message : 'のこせませんでした');
    }
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label="いまの状態をのこす" onClick={(e) => e.stopPropagation()}>
        <h2 className="screen-title">いまの状態をのこす</h2>

        <div className="segment">
          {(Object.keys(KIND_LABELS) as EntryKind[]).map((k) => (
            <button
              key={k}
              type="button"
              className={kind === k ? 'segment-item active' : 'segment-item'}
              onClick={() => setKind(k)}
            >
              {KIND_LABELS[k]}
            </button>
          ))}
        </div>

        <p className="caption">領域(複数えらべます)</p>
        <div className="chip-row">
          {DOMAINS.map((d) => (
            <button
              key={d}
              type="button"
              className={domains.includes(d) ? 'chip-select active' : 'chip-select'}
              style={{ '--chip-color': `var(--domain-${d})` } as React.CSSProperties}
              onClick={() => toggleDomain(d)}
            >
              {DOMAIN_LABELS[d]}
            </button>
          ))}
        </div>

        {kind === 'event' && (
          <input
            className="field"
            placeholder="タイトル"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        )}

        {kind === 'mood' && (
          <div className="segment">
            {MOODS.map((m) => (
              <button
                key={m}
                type="button"
                className={mood === m ? 'segment-item active' : 'segment-item'}
                onClick={() => setMood(m)}
              >
                {['😞', '😕', '😐', '🙂', '😊'][m - 1]}
              </button>
            ))}
          </div>
        )}

        {kind === 'metric' && (
          <div className="metric-row">
            <input className="field" placeholder="ラベル(体重など)" value={label} onChange={(e) => setLabel(e.target.value)} />
            <input className="field" placeholder="値" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} />
            <input className="field" placeholder="単位" value={unit} onChange={(e) => setUnit(e.target.value)} />
          </div>
        )}

        {kind !== 'metric' && kind !== 'event' && (
          <textarea
            className="field"
            rows={4}
            placeholder={kind === 'mood' ? '一言(なくてもいい)' : ''}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        )}

        {error && <p className="caption">{error}</p>}

        <button type="button" className="save-button" disabled={!canSave} onClick={() => void save()}>
          のこす
        </button>
      </div>
    </div>
  );
}
