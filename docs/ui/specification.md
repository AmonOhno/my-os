# UI設計 — 画面構成・コンポーネント・デザイントークン

モバイル（iPhone）ファーストのPWA。ビジュアルの正は [MyOS_UIMockUp.pdf](../../MyOS_UIMockUp.pdf)。

## 1. トーン

- 温かみのあるクリーム地 + テラコッタのアクセント。角丸大きめ、影は淡く。
- 「管理ツール」ではなく「静かなノート」。赤字の警告・バッジ・カウンタを使わない。
- 文言はやわらかい日本語（「のこす」「きょう」「つながり」）。命令形・督促形を使わない。

## 2. デザイントークン（CSS変数）

```css
/* src/styles/tokens.css */
:root {
  /* base */
  --color-bg: #faf6ef;        /* 画面背景（クリーム） */
  --color-surface: #ffffff;   /* カード */
  --color-surface-warm: #f6efe3; /* ふりかえりカード等の淡い面 */
  --color-ink: #3a3430;       /* 本文 */
  --color-ink-muted: #9a9089; /* 補足・時刻 */
  --color-line: #e9e1d4;      /* 罫線 */
  --color-accent: #bc6c4a;    /* テラコッタ: FAB・のこすボタン・選択状態 */

  /* domain colors（チップ・ノード） */
  --domain-health:   #7e9070;
  --domain-career:   #a86f3f;
  --domain-learning: #6e86a0;
  --domain-family:   #c08a8a;
  --domain-finance:  #8a9b8e;
  --domain-projects: #8d7aa5;
  --domain-mental:   #c97b5a;
  --domain-travel:   #5f8a8b;

  /* shape / spacing */
  --radius-card: 16px;
  --radius-chip: 999px;
  --space-unit: 4px;          /* 4px グリッド */
  --shadow-card: 0 1px 4px rgb(58 52 48 / 6%);

  /* type */
  --font-body: -apple-system, "Hiragino Sans", system-ui, sans-serif;
  --text-title: 600 22px/1.4 var(--font-body);
  --text-body: 400 15px/1.7 var(--font-body);
  --text-caption: 400 12px/1.5 var(--font-body);
}
```

- 領域チップは領域色の**淡い背景 + 濃い文字**（色そのままのベタ塗りにしない）。
- ダークモードは初期リリースでは対応しない（トークン化してあるので後から追加可能）。

## 3. 画面一覧

| 画面 | ルート | 概要 |
|------|--------|------|
| きょう（ホーム） | `#/` | あいさつ・状態カード・タイムライン |
| 領域タイムライン | `#/domain/:domain` | 領域で絞ったタイムライン（financeのみ専用ビュー） |
| つながり | `#/connections` | 月切替・マップ・ふりかえり |
| エントリ詳細 | `#/entry/:id` | 表示・編集・削除・つなげる |
| 設定 | `#/settings` | Finance トークン・エクスポート/インポート |
| 記録シート | （モーダル） | ルートを持たないボトムシート |

## 4. 主要コンポーネント

| コンポーネント | 用途 | 備考 |
|---------------|------|------|
| `AppTabBar` | 下部タブ（きょう/つながり） | 選択中はアクセント色 |
| `Fab` | 記録シート起動 | 全画面右下に固定 |
| `RecordSheet` | 記録入力ボトムシート | kind セグメント・領域チップ・入力・のこすボタン |
| `KindSegment` | メモ/気分/数値/出来事の切替 | 選択中はアクセント地に白文字 |
| `DomainChip` | 領域表示・選択 | selectable / readonly の2モード |
| `MoodPicker` | 5段階の気分選択 | 絵文字 or 図形5つ。ラベル: とても悪い〜とても良い |
| `MetricInput` | ラベル+数値+単位 | 直近の組をサジェスト |
| `StatusCard` | きょうの領域状態カード | 横スクロールリスト内 |
| `FinanceCard` | Finance 専用カード | 取得中/成功/失敗/未設定の4状態 |
| `TimelineList` / `EntryRow` | タイムライン | 日付見出しでグルーピング、無限スクロール |
| `ConnectionMap` | つながりマップ | SVG + d3-force。ズーム/パン |
| `MonthSwitcher` | 月切替 | `‹ 2026年7月 ›` |
| `ReviewCard` | ふりかえり表示/起動 | 淡い warm 背景 |
| `ConfirmDialog` | 削除・インポートの確認 | 破壊的操作のみに使用 |
| `Toast` | 保存失敗等の通知 | 自動消滅。成功時は原則出さない（画面変化で十分） |

## 5. インタラクション原則

- 保存成功はトーストを出さず、画面に結果が現れることで伝える。
- 空状態は静かに。イラストや「さあ始めよう！」的な文言は使わない。
- 削除とインポート（全置換）だけは確認ダイアログを挟む。
- アニメーションはシートの出入りとマップの force 収束のみ。装飾的モーションは足さない。
- タップターゲットは最小 44×44px（iOS基準）。セーフエリア（ノッチ・ホームバー）に `env(safe-area-inset-*)` で対応。
