# My training — トレーニングアプリとの連携

## 1. 方針（Issue #9 / 読み取り専用ポーリング方式）

トレーニングの記録は既存の My training アプリで行っている。MyOS で作り直さず、**そのAPIを読み取り専用で呼ぶ**。webhook 受信のような常駐エンドポイントは MyOS 側に持てない（サーバーレス・0円原則）ため、finance 連携（[finance_integration.md](finance_integration.md)）と同型の**表示時ポーリング**とする。

- MyOS はトレーニングデータを**保存しない**。表示のたびに取得し、メモリ内のみ短時間キャッシュ（TTL 10分）。
- 書き込み・編集は My training 側で行う。
- API が落ちていても MyOS は普通に使える。Health 領域ビューの表示が「取得できませんでした」になるだけ。

## 2. 認証

- My training 側で発行する**自分専用のAPIトークン**を使う（Bearer ヘッダ）。
- ベースURLとトークンは MyOS の設定画面で貼り付け、`localStorage` に保存する（`myos.training.baseUrl` / `myos.training.token`）。サーバーには送らない・エクスポートJSONにも含めない。
- 未設定のときは Health 領域ビューに何も出さない（空状態は静かに空のまま）。

## 3. エンドポイント（My training 側で用意する読み取り専用API）

以下の契約を My training 側で実装する（asset-simulator の `myos` Edge Function と同型でよい）。クライアント実装は `src/training/client.ts`。

### GET /summary?month=YYYY-MM

Health 領域ビューの今月サマリ用。表示時に自動取得する。

```json
{ "month": "2026-07", "sessions": 12, "totalMinutes": 540 }
```

### GET /sessions?range=YYYY-MM-DD..YYYY-MM-DD

期間内のセッション一覧。Health 領域ビュー表示時に**直近7日分**を自動取得し、日付の新しい順に「日付・種目・時間」を眺めるだけの一覧として表示する（entries には保存しない）。

```json
{ "sessions": [ { "date": "2026-07-05", "title": "胸・肩", "minutes": 60 } ] }
```

## 4. Health 領域ビュー

きょう画面の Health カード tap で遷移。エントリ一覧の上に表示する。

- 今月のトレーニング（回数 / 合計時間の数字のみ。**グラフ・達成率・ストリークは出さない**）
- 直近7日のセッション一覧

## 5. エラーハンドリング

| 状況 | 表示 |
|------|------|
| トークン未設定 | 何も表示しない（エントリ一覧のみ） |
| ネットワーク/5xx/タイムアウト(5秒) | 「取得できませんでした」+ 再試行tap。他機能は影響なし |
| 401/403 | 同上（トークンは設定画面で更新） |

失敗時にリトライの自動連打はしない（再表示 or 手動再試行時のみ）。キャッシュが残っていれば前回値を表示し続ける。

## 6. CORS についての注意

finance 連携と同じ（[finance_integration.md](finance_integration.md) §6）。My training の API 側で `*.github.io` オリジンを CORS 許可する。iOS（Capacitor）では `CapacitorHttp` により CORS 自体を回避する。
