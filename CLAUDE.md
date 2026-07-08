# CLAUDE.md — MyOS

## プロジェクト概要

自分を理解するための、人生のOS。11の領域（Health/Mental/Career/Finance/Learning/Family/Social/Hobby/Travel/Private/Living）の状態を「残す・見る・考える」個人用アプリ。利用者は開発者本人ひとり。

**サーバーレスのローカルファーストPWA**。データは端末内 IndexedDB のみ、ホスティングは GitHub Pages。ランニングコストは0円で、これを崩す変更（サーバー・BaaS・有料API の導入）は行わない。

## 最上位の設計原則 — 「管理」ではなく「理解」

実装・改修時に**絶対に足さないもの**:

- ストリーク（連続記録）・達成率・グラフ・スコア・KPI
- 記録の督促・リマインド・通知・「記録がありません」系の空状態文言
- AI 機能・自動サジェスト・スコアリング（要件定義書 §6「今は決めないこと」）
- Finance データのローカル保存（既存家計アプリAPIの読み取り表示のみ）

迷ったら [requirements.md](requirements.md) §2 に立ち返る。

## 技術スタック

React 19 + Vite + TypeScript / Dexie.js (IndexedDB) / Zustand / React Router (HashRouter) / d3-force / vite-plugin-pwa / Vitest。
詳細と選定理由: [docs/architecture/overview.md](docs/architecture/overview.md)

## ディレクトリ構成（実装時）

```
src/
├── app/         # エントリポイント・ルーティング・PWA登録
├── screens/     # Today / Connections / RecordSheet / EntryDetail / Settings
├── components/  # 共有UI（DomainChip, EntryCard, MoodPicker など）
├── db/          # Dexie スキーマ・リポジトリ関数
├── stores/      # Zustand ストア（DBアクセスは必ずストア経由）
├── finance/     # 家計アプリAPIクライアント（GET のみ・保存禁止）
├── styles/      # tokens.css・base.css
└── types/       # 型定義のみ（ロジックを置かない）
```

## 開発フロー — Issue 駆動開発

ソース修正は必ず GitHub Issue を起点にする:

1. **Issue がなければ先に作成する**。修正・機能追加の内容に対応する Issue が存在しない場合、`gh issue create` で作成してからソース修正に着手する（タイトルは既存 Issue にならい `【対象 / 種別】概要` 形式）。
2. **最新の main から着手する**。作業前に `git switch main && git pull` で最新化し、そこから作業ブランチを切る。main に直接コミットしない。
3. ブランチ名は `fix/<Issue番号>-<slug>` / `feat/<Issue番号>-<slug>` / `docs/<Issue番号>-<slug>`（asset-simulator と同じ規約）。
4. コミットメッセージと PR に Issue 番号（`#<番号>`）を含め、PR 本文に `Closes #<番号>` を書いて Issue と紐づける。

## コーディング規約

- `types/` に変換関数等のロジックを置かない（asset-simulator と同じルール）
- 画面から直接 Dexie を触らない。ストア → リポジトリ → DB の一方向
- ミューテーション後は変更したリソースのストアだけ再読込。「全データ再取得」関数は作らない
- ID 規約: エントリ `ent_<uuid>` / リンク `lnk_<uuid>` / ふりかえり `rev_<uuid>`
- 日時は ISO 8601 文字列（ローカル時刻 + オフセット）で保存
- 色・角丸・余白は `src/styles/tokens.css` の CSS 変数のみ使用。ハードコード禁止
- Finance API トークンは localStorage のみ。エクスポートJSONやログに含めない

## ドキュメント一覧（docs/）

索引: [docs/README.md](docs/README.md)

| ファイル | 内容 |
|---------|------|
| `docs/architecture/overview.md` | 技術スタック（0円構成）・ディレクトリ・データフロー |
| `docs/feature/overview.md` | 機能一覧・画面遷移・11領域の定義 |
| `docs/feature/record.md` | 残す — 記録シート（エントリ4種） |
| `docs/feature/today.md` | 見る — きょう画面 |
| `docs/feature/connections.md` | 考える — つながり・月次ふりかえり |
| `docs/feature/finance_integration.md` | Finance 読み取り専用連携 |
| `docs/ui/specification.md` | 画面・コンポーネント・デザイントークン |
| `docs/database/schema.md` | Dexie スキーマ・ID規約・エクスポート形式 |

機能を追加・変更するときは、対応する docs を同じ変更で更新すること。
