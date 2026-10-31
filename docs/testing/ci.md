# テストと CI（GitHub Actions）

PR の作成・更新時に 2 つのワークフローが動く（Issue #15）。

| ワークフロー | ファイル | トリガー | 内容 |
|---|---|---|---|
| E2E | `.github/workflows/e2e.yml` | PR（opened / synchronize / reopened / ready_for_review）、main への push | Vitest ユニットテスト → `npm run build`（`tsc -b` 型チェック + vite build）→ Playwright スモーク E2E。1 件でも失敗すればジョブは失敗 |
| Claude Code Review | `.github/workflows/claude-code-review.yml` | PR（同上。Draft と fork からの PR は除外） | 公式プラグイン `code-review@claude-plugins-official` で PR をレビューし、PR にコメントする |

## 「全件パス」の定義

- E2E は **リトライなし**（`playwright.config.ts` の `retries: 0` に加え、CI では `--retries=0` を明示）。リトライで通った flaky も合格扱いにしない。
- CI では `test.only` が残っているとエラー（`forbidOnly`）。
- テストの skip / 無効化で緑にしない。落ちたテストは原因を直す。
- 失敗時のトレース・スクリーンショット・HTML レポートは Actions の Artifact `playwright-report` に 14 日間残る。

## ローカルでの実行

```bash
npm ci
npx playwright install chromium   # 初回のみ
CI=1 npm run test:unit
CI=1 npm run test:e2e -- --retries=0   # pretest:e2e で先に build が走る
```

## E2E の対象範囲（`e2e/smoke.spec.ts`）

Web アプリ（`vite preview` で配信したビルド成果物）を Chromium のモバイルビューポートで操作する最小限のスモーク。

- きょう画面の表示（空のときに督促文言を出さない）
- 記録シートでメモをのこす → タイムライン表示 → 再読込後も IndexedDB に残る → 状態カードから領域画面へ
- 領域未選択では保存できない／背景タップでシートが閉じる
- タブ・リンクで つながり / 設定 画面を行き来する

## CI の対象外としたもの

| 対象 | 理由 |
|---|---|
| iOS ネイティブ（`ios/`、Capacitor + Xcode） | macOS ランナーと Xcode・署名設定が必要でコストと実行時間が大きい（0 円構成の方針と合わない）。Web 部分は同じビルド成果物を E2E で検証しているため、ネイティブ固有の確認は手元の Xcode / 実機で行う |
| Finance / My training 連携の実 API | 外部の家計アプリ・トレーニングアプリと API トークンが必要。CI に実トークンを置かない（CLAUDE.md の方針）。クライアント・ストアの挙動はユニットテスト（fetch モック）で検証している |
| ファイルのエクスポート / インポート（設定画面） | ダウンロード・ファイル選択・`confirm` ダイアログを伴う。データ変換ロジックは `src/db/exportImport.test.ts` で検証している |
| PWA のオフライン動作 / Service Worker | テスト間のキャッシュ干渉を避けるため E2E では Service Worker をブロックしている |

## 手動で行う設定

### 1. Secrets（Claude Code Review 用）

リポジトリの **Settings → Secrets and variables → Actions → New repository secret** で、次の **どちらか一方** を登録する。

- `ANTHROPIC_API_KEY` — Anthropic Console で発行した API キー（従量課金）
- `CLAUDE_CODE_OAUTH_TOKEN` — Claude Pro / Max サブスクリプションで使う場合。手元で `claude setup-token` を実行して発行する

E2E ワークフローは Secrets 不要。

### 2. Claude GitHub App のインストール

https://github.com/apps/claude からリポジトリ `AmonOhno/my-os` にインストールする（手元の Claude Code で `/install-github-app` を実行しても、App のインストールと Secret 登録をまとめて行える）。

### 3. ブランチ保護で E2E を必須チェックにする

1. **Settings → Branches → Add branch ruleset**（または Branch protection rule）で対象ブランチに `main` を指定
2. **Require status checks to pass** を有効化し、チェック `test`（E2E ワークフローのジョブ。一度 PR でワークフローが走ると候補に出る）を追加
3. 必要に応じて **Require branches to be up to date before merging** も有効化

Claude Code Review は助言的なレビューのため必須チェックにはしない（Secrets 未設定や API 障害でマージを止めないため）。
