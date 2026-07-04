# アーキテクチャ概要

## 1. システム概要

MyOS は「人生を構成する情報を一つの場所に集め、自分の状態を理解する」ための個人用アプリ。
利用者は開発者本人ひとり。マルチユーザー・共有・同期は要件に含まれない。

この前提から、**サーバーを持たないローカルファーストPWA** を採用する。
データはすべて端末内（ブラウザの IndexedDB）に保存し、アプリ本体は静的ファイルとして無料ホスティングから配信する。

## 2. コスト0円の成立条件

| 項目 | 採用 | 費用 | 備考 |
|------|------|------|------|
| ホスティング | GitHub Pages | 0円 | 静的ファイルのみ。独自ドメイン不要（`*.github.io`） |
| データベース | IndexedDB（端末内） | 0円 | サーバーDBを持たない |
| 認証 | なし | 0円 | 端末＝本人。ロックはOS側（Face ID等）に任せる |
| バックアップ | JSONエクスポート（手動） | 0円 | ファイルとして書き出し、iCloud/Drive等に自分で置く |
| Finance連携 | 既存家計アプリのAPI | 0円 | 既に運用中のものを読み取り専用で呼ぶだけ |
| CI | GitHub Actions（public リポ） | 0円 | ビルド & Pages デプロイ |

**運用ルール: 有料サービス・従量課金APIは導入しない。** 将来の同期機能なども、無料枠で完結しない案は採用しない。

## 3. 技術スタック

| レイヤ | 技術 | 選定理由 |
|--------|------|---------|
| 言語 | TypeScript | 型でデータモデル（エントリ4種）を守る |
| UI | React 19 + Vite | asset-simulator と揃え、知見を流用する |
| PWA | vite-plugin-pwa | iPhone ホーム画面に追加してネイティブ風に使う（モックアップはiOS想定） |
| ローカルDB | Dexie.js（IndexedDB ラッパー） | スキーマ定義・インデックス・マイグレーションが宣言的に書ける |
| 状態管理 | Zustand | asset-simulator と同じ。ストア経由でDBを読み書き |
| ルーティング | React Router（HashRouter） | GitHub Pages はSPAフォールバックがないため hash ルーティングにする |
| つながりマップ描画 | SVG + d3-force | ノード数は個人利用規模（数十〜数百）なので force layout で十分 |
| テスト | Vitest + Testing Library | Vite と同系。DB層は fake-indexeddb でテスト |
| Lint/Format | ESLint + Prettier | 標準構成 |

### 採用しないもの（と理由）

- **サーバー / BaaS（Supabase等）** — 0円でも無料枠の失効・休眠停止リスクがある。単一ユーザーに同期不要。
- **SQLite (wasm) + OPFS** — 今の規模では Dexie で十分。テーブル4つ・JOINも軽い。
- **CSSフレームワーク** — 画面3つ + シート1つ。デザイントークン（[ui/specification.md](../ui/specification.md)）を CSS変数で持ち、素のCSSで書く。

## 4. ディレクトリ構成（実装時）

```
my-os/
├── public/               # アイコン・manifest
├── src/
│   ├── app/              # エントリポイント・ルーティング・PWA登録
│   ├── screens/          # Today / Connections / RecordSheet / EntryDetail
│   ├── components/       # 共有UI（DomainChip, EntryCard, MoodPicker など）
│   ├── db/               # Dexie スキーマ・リポジトリ関数
│   ├── stores/           # Zustand ストア（entriesStore, linksStore, financeStore）
│   ├── finance/          # 家計アプリAPIクライアント（読み取り専用）
│   ├── styles/           # tokens.css（デザイントークン）・base.css
│   └── types/            # 型定義のみ（ロジックなし）
├── docs/                 # 設計ドキュメント
└── .github/workflows/    # Pages デプロイ
```

`types/` にロジックを置かない・ストア経由でしかDBを触らない、という分離ルールは asset-simulator と同じ。

## 5. データフロー

```
[画面(screens)] ── アクション呼び出し ──> [Zustand ストア]
                                             │
                                             ├─> [db/repository] ──> IndexedDB (Dexie)
                                             │        entries / links / reviews
                                             │
                                             └─> [finance/client] ──> 既存家計アプリ API (GET のみ)
                                                      └─ メモリ内キャッシュ（TTL 10分）
```

- 書き込みは entries / links / reviews のみ。Finance のデータは**一切ローカルに保存しない**（表示のたびに取得、メモリキャッシュのみ）。
- ミューテーション後は変更したリソースのストアだけを再読込する（全データ再取得の関数は作らない — asset-simulator と同じルール）。

## 6. オフラインとバックアップ

- PWA のプリキャッシュによりアプリ本体は完全オフラインで動く。データも端末内なので、**ネットワークが必要なのは Finance カードだけ**。
- Finance API に届かないときは「取得できませんでした」カードにフォールバックし、他機能は影響を受けない。
- バックアップは設定画面から **JSON エクスポート/インポート**（形式は [database/schema.md](../database/schema.md) §5）。
  IndexedDB はブラウザデータ削除で消えるため、月次ふりかえりのタイミングでエクスポートを促す一文を出す（通知はしない — 要件定義書 §6）。

## 7. 非対応と将来拡張

| 項目 | 現在 | 将来必要になったら |
|------|------|------------------|
| 複数端末同期 | 非対応（1端末 + JSONで移行） | エクスポートJSONをストレージ経由で往復 |
| タグ | 非対応 | `tags` テーブルを追加（payload に埋めない — ConceptSheet §04） |
| AI・通知・スコアリング | 設計しない | 要件定義書 §6 に従いその時に設計 |
