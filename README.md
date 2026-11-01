# MyOS

自分を理解するための、人生のOS。

## アーキテクチャ概要

サーバーを持たないローカルファーストの PWA（+ Capacitor による iOS ラッパー）。データは端末内 IndexedDB のみに保存し、外部の家計アプリ API / My training API は読み取り専用で参照する。

```mermaid
C4Container
  title Container — MyOS

  Person(user, "本人")

  System_Boundary(myos, "MyOS") {
    Container(spa, "Web アプリ (SPA)", "React 19 / TypeScript / Zustand", "画面・状態管理・外部APIクライアント")
    Container(sw, "Service Worker", "vite-plugin-pwa", "プリキャッシュとオフライン起動")
    Container(ios, "iOS アプリ", "Capacitor 8 / WKWebView", "Web ビルドを内包して表示")
    ContainerDb(idb, "IndexedDB 'myos'", "Dexie 4", "entries / links / reviews")
    ContainerDb(ls, "localStorage", "Web Storage", "外部APIのベースURL・トークン")
  }

  System_Ext(finance, "家計アプリ API", "Supabase Edge Function")
  System_Ext(training, "My training API", "読み取り専用API")

  Rel(user, spa, "操作", "ブラウザ / PWA")
  Rel(user, ios, "操作", "iPhone")
  Rel(ios, spa, "ビルド済みアセットを読み込む")
  Rel(spa, idb, "読み書き", "Dexie")
  Rel(spa, ls, "設定の読み書き")
  Rel(spa, finance, "GET", "HTTPS/JSON")
  Rel(spa, training, "GET", "HTTPS/JSON")
  Rel(sw, spa, "キャッシュ済みアセットを提供")

  UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```

詳細（System Context / Component 図・データフロー・ディレクトリ構成）は [docs/architecture.md](docs/architecture.md) を参照。

---

## ドキュメント

- 要件定義書: [requirements.md](requirements.md)
- 設計ドキュメント索引: [docs/README.md](docs/README.md)
- 開発ルール: [CLAUDE.md](CLAUDE.md)

## 開発

```sh
npm install
npm run dev     # 開発サーバー
npm run build   # 型チェック + ビルド（dist/）
npm test        # Vitest
```
