import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Review } from '../types/models';

interface Props {
  month: string; // 'YYYY-MM'
  review: Review | undefined;
  onSave: (body: string) => Promise<void>;
}

// 月次ふりかえりカード — docs/feature/connections.md §5
// 未作成なら「この月をふりかえる」、作成済みなら本文表示 + tapで編集
export function ReviewCard({ month, review, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 月を切り替えたら編集状態を畳む
  useEffect(() => {
    setEditing(false);
    setSaved(false);
    setError(null);
  }, [month]);

  const startEdit = () => {
    setDraft(review?.body ?? '');
    setSaved(false);
    setEditing(true);
  };

  const save = async () => {
    try {
      await onSave(draft);
      setEditing(false);
      setSaved(true);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存できませんでした');
    }
  };

  return (
    <section className="review-card">
      <p className="caption">ふりかえり</p>
      {editing ? (
        <>
          <textarea
            className="field"
            rows={4}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="この月の気づき"
          />
          {error && <p className="caption">{error}</p>}
          <button
            type="button"
            className="save-button"
            disabled={!draft.trim()}
            onClick={() => void save()}
          >
            のこす
          </button>
        </>
      ) : review ? (
        <button type="button" className="review-body" onClick={startEdit}>
          {review.body}
        </button>
      ) : (
        <button type="button" className="review-start" onClick={startEdit}>
          この月をふりかえる
        </button>
      )}
      {saved && (
        <p className="caption">
          エクスポートも忘れずに — <Link to="/settings">設定へ</Link>
        </p>
      )}
    </section>
  );
}
