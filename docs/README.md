# ドキュメント索引

MyOS の設計ドキュメント一覧です。

出発点は [requirements.md](../requirements.md)（要件定義書）、
コンセプトとモックアップは [MyOS_ConceptSheet.pdf](../MyOS_ConceptSheet.pdf) / [MyOS_UIMockUp.pdf](../MyOS_UIMockUp.pdf) を参照。

## アーキテクチャ設計

| ファイル | 内容 |
|---------|------|
| [architecture/overview.md](architecture/overview.md) | システム概要・技術スタック（0円構成）・ディレクトリ構成・データフロー |

## 機能設計

| ファイル | 内容 |
|---------|------|
| [feature/overview.md](feature/overview.md) | 機能一覧・画面遷移 |
| [feature/record.md](feature/record.md) | 残す — 記録シート（エントリ4種の入力） |
| [feature/today.md](feature/today.md) | 見る — きょう画面（状態カード・タイムライン） |
| [feature/connections.md](feature/connections.md) | 考える — つながり画面（リンク・マップ・月次ふりかえり） |
| [feature/finance_integration.md](feature/finance_integration.md) | Finance — 既存家計アプリとの読み取り専用連携 |

## UI設計

| ファイル | 内容 |
|---------|------|
| [ui/specification.md](ui/specification.md) | 画面構成・コンポーネント仕様・デザイントークン |

## データ設計

| ファイル | 内容 |
|---------|------|
| [database/schema.md](database/schema.md) | ローカルDB（IndexedDB/Dexie）スキーマ・ID規約・エクスポート形式 |

## 設計の前提

- **コスト0円** — サーバー・DB・有料APIを一切持たない。静的ホスティング + 端末内ストレージで完結する。
- **「管理」ではなく「理解」** — ストリーク・達成率・グラフによる圧をかけない。要件定義書 §2 を最上位の判断基準とする。
- **今は決めないこと**（要件定義書 §6）には先回りしない。AI・KPI・スコアリング・通知・Finance以外の外部連携は設計しない。
