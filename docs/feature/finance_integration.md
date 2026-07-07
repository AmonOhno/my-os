# Finance — 既存家計アプリとの連携

## 1. 方針

お金の領域は、既に開発・運用中の家計アプリ（asset-simulator）がある。MyOS で作り直さず、**そのAPIを読み取り専用で呼ぶ**。

- MyOS は金銭データを**保存しない**。表示のたびに取得し、直近サマリのみ短時間キャッシュ（メモリ内、TTL 10分）。
- 書き込み・編集は既存アプリ側で行う。MyOS からは「アプリで開く」リンク（URL遷移）だけ。
- API が落ちていても MyOS は普通に使える。Finance カードが「取得できませんでした」になるだけ。

## 2. 認証

- 既存アプリ側で発行する**自分専用のAPIトークン**（`ast_...`）を使う（Bearer ヘッダ）。発行手順は asset-simulator リポジトリの `docs/api/myos_integration.md` を参照。
- トークンは MyOS の設定画面で貼り付け、`localStorage` に保存する（端末＝本人の前提。サーバーには送らない・エクスポートJSONにも含めない）。
- トークン未設定のときは Finance カードに「設定から連携できます」を表示。

## 3. エンドポイント（asset-simulator の公開API）

実体は asset-simulator の Supabase Edge Function。ベースURLを MyOS の設定画面に登録する。

```
https://<project-ref>.supabase.co/functions/v1/myos
```

詳細仕様は asset-simulator リポジトリの `docs/api/myos_integration.md`。

### GET /summary?month=YYYY-MM

きょう画面の Finance カード用。表示時に自動取得する。

```json
{ "month": "2026-07", "income": 320000, "expense": 277700, "net": 42300 }
```

### GET /categories?month=YYYY-MM

Finance 領域ビュー用のカテゴリ別内訳（支出のみ・金額降順）。表示時に自動取得する。

```json
{ "month": "2026-07", "categories": [ { "name": "食費", "amount": 48200 }, ... ] }
```

### GET /events?range=YYYY-MM-DD..YYYY-MM-DD&min_amount=N

支出イベント。きょう画面表示時に**きのう1日分**を `min_amount=0` で自動取得し、支出（負値）だけを MyOS 側で合算して、タイムラインのきのうの日付グループに「支出合計 ◯◯円」の読み取り専用行として1行だけ混ぜる（entries には保存しない・個別イベントは表示しない）。API に日次合計のエンドポイントはないため、合算はクライアント側（`src/finance/client.ts` の `fetchDailyExpense`）で行う。

```json
{ "events": [ { "date": "2026-07-05", "title": "家賃", "amount": -95000 } ] }
```

## 4. Finance 領域ビュー

きょう画面の Finance カード tap で遷移。

- 今月サマリ（収入 / 支出 / 収支）
- カテゴリ別内訳（金額の一覧。**円グラフ等は出さない** — 数字を眺めるだけ）
- 「家計アプリで開く」ボタン（既存アプリのURLへ遷移）

## 5. エラーハンドリング

| 状況 | 表示 |
|------|------|
| トークン未設定 | 「設定から連携できます」 |
| ネットワーク/5xx/タイムアウト(5秒) | 「取得できませんでした」+ 再試行tap。他機能は影響なし |
| 401/403 | 「トークンを確認してください」+ 設定への導線 |

失敗時にリトライの自動連打はしない（再表示 or 手動再試行時のみ）。キャッシュが残っていれば「◯分前の情報」として表示し続ける。

## 6. CORS についての注意

MyOS は `*.github.io` から fetch するため、既存アプリのAPI側で当該オリジンを CORS 許可する必要がある（自分のアプリなのでヘッダを1つ足すだけ）。許可できない場合の代替はディープリンク運用のみとし、プロキシサーバーは立てない（0円原則）。
