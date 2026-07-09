import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getFinanceConfig, setFinanceConfig } from '../finance/client';
import { getTrainingConfig, setTrainingConfig } from '../training/client';
import { exportData, exportFileName, importData } from '../db/exportImport';
import { useEntriesStore } from '../stores/entriesStore';

function download(name: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function SettingsScreen() {
  const initial = getFinanceConfig();
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl);
  const [token, setToken] = useState(initial.token);
  const initialTraining = getTrainingConfig();
  const [trainingBaseUrl, setTrainingBaseUrl] = useState(initialTraining.baseUrl);
  const [trainingToken, setTrainingToken] = useState(initialTraining.token);
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const loadEntries = useEntriesStore((s) => s.loadEntries);

  const saveFinance = () => {
    setFinanceConfig(baseUrl, token);
    setMessage(null);
  };

  const saveTraining = () => {
    setTrainingConfig(trainingBaseUrl, trainingToken);
    setMessage(null);
  };

  const doExport = async () => {
    download(exportFileName(), await exportData());
  };

  const doImport = async (file: File) => {
    if (!window.confirm('いまのデータをすべて置き換えます。よろしいですか？（実行前に現在のデータを自動エクスポートします）')) return;
    try {
      // 全置換の前に現行データを自動エクスポート（docs/database/schema.md §5）
      download(exportFileName(), await exportData());
      const counts = await importData(JSON.parse(await file.text()));
      await loadEntries();
      setMessage(`読み込みました（記録 ${counts.entries} / つながり ${counts.links} / ふりかえり ${counts.reviews}）`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '読み込めませんでした');
    }
  };

  return (
    <div className="screen">
      <p>
        <Link to="/" className="back-link">
          ‹ きょう
        </Link>
      </p>
      <h1 className="screen-title">設定</h1>

      <section className="card settings-section">
        <p className="caption">Finance 連携（読み取りのみ・この端末にだけ保存）</p>
        <input
          className="field"
          placeholder="API のURL（https://….supabase.co/functions/v1/myos）"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
        />
        <input
          className="field"
          type="password"
          placeholder="APIトークン"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
        <button type="button" className="save-button" onClick={saveFinance}>
          保存する
        </button>
      </section>

      <section className="card settings-section">
        <p className="caption">My training 連携（読み取りのみ・この端末にだけ保存）</p>
        <input
          className="field"
          placeholder="API のURL"
          value={trainingBaseUrl}
          onChange={(e) => setTrainingBaseUrl(e.target.value)}
        />
        <input
          className="field"
          type="password"
          placeholder="APIトークン"
          value={trainingToken}
          onChange={(e) => setTrainingToken(e.target.value)}
        />
        <button type="button" className="save-button" onClick={saveTraining}>
          保存する
        </button>
      </section>

      <section className="card settings-section">
        <p className="caption">データ（エクスポートにトークンは含まれません）</p>
        <button type="button" className="save-button" onClick={() => void doExport()}>
          エクスポート
        </button>
        <button type="button" className="segment-item" onClick={() => fileRef.current?.click()}>
          インポート（全置換）
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void doImport(f);
            e.target.value = '';
          }}
        />
        {message && <p className="caption">{message}</p>}
      </section>
    </div>
  );
}
