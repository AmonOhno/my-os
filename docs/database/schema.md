# データ設計 — ローカルDB（IndexedDB / Dexie）

## 1. 方針

- 中心はたった1つのテーブル `entries`。**種類ごとにテーブルを分けない。** kind 固有の値は `payload` に逃がす（ConceptSheet §04）。
- ConceptSheet の `entry_domains`（多対多テーブル）は、Dexie では **multiEntry インデックス**（`domains: string[]`）として表現する。RDB ではないので中間テーブルは不要。
- Finance のデータはローカルに持たない。
- タグが必要になったら payload ではなく `tags` テーブルを足す — 今は作らない。

## 2. Dexie スキーマ定義

```ts
// src/db/db.ts
import Dexie, { type Table } from 'dexie';

export class MyOSDatabase extends Dexie {
  entries!: Table<Entry, string>;
  links!: Table<Link, string>;
  reviews!: Table<Review, string>;

  constructor() {
    super('myos');
    this.version(1).stores({
      entries: 'id, occurredAt, kind, *domains, createdAt',
      links: 'id, fromEntry, toEntry, createdAt',
      reviews: 'id, &month, createdAt',
    });
  }
}
```

## 3. 型定義

```ts
// src/types/models.ts — 型のみ。ロジックを置かない

export type Domain =
  | 'health' | 'career' | 'learning' | 'family'
  | 'finance' | 'projects' | 'mental' | 'travel';

export type EntryKind = 'note' | 'mood' | 'metric' | 'event';

export interface Entry {
  id: string;            // ent_<uuid>
  occurredAt: string;    // ISO 8601（端末ローカル時刻 + オフセット）
  kind: EntryKind;
  domains: Domain[];     // 1つ以上（multiEntry index）
  title?: string;        // event で必須
  body?: string;         // note で必須 / mood・event の一言
  mood?: 1 | 2 | 3 | 4 | 5;               // mood で必須
  payload?: { label: string; value: number; unit?: string }; // metric で必須
  createdAt: string;
  updatedAt: string;
}

export interface Link {
  id: string;            // lnk_<uuid>
  fromEntry: string;     // Entry.id
  toEntry: string;       // Entry.id
  note?: string;         // 一言メモ
  createdAt: string;
}
// 無向として扱う: 重複判定は {from,to} と {to,from} を同一視する

export interface Review {
  id: string;            // rev_<uuid>
  month: string;         // 'YYYY-MM'（ユニーク）
  body: string;
  createdAt: string;
  updatedAt: string;
}
```

## 4. 規約

### ID 命名（asset-simulator と同方式）

| リソース | プレフィックス | 例 |
|---------|--------------|---|
| エントリ | `ent_` | `ent_9f2c…` |
| リンク | `lnk_` | `lnk_41ab…` |
| ふりかえり | `rev_` | `rev_77d0…` |

UUID は `crypto.randomUUID()` で採番。

### 日時

- すべて ISO 8601 文字列で保存（例: `2026-07-04T07:30:00+09:00`）。
- 「その月のエントリ」判定は端末ローカルタイムゾーンで行う。

### 整合性（アプリ層で保証）

- エントリ削除時は、そのエントリを参照する `links` を同一トランザクションで削除する。
- `reviews.month` はユニーク（`&month`）。upsert で扱う。
- kind ごとの必須フィールドはリポジトリ層の save 関数でバリデーションする（DBは型を強制しないため）。

## 5. エクスポート / インポート形式

設定画面から全データを1つのJSONで出し入れする。

```json
{
  "app": "myos",
  "schemaVersion": 1,
  "exportedAt": "2026-07-04T21:00:00+09:00",
  "entries": [ ... ],
  "links": [ ... ],
  "reviews": [ ... ]
}
```

- ファイル名: `myos-export-YYYYMMDD.json`
- Finance トークン等の設定値は**含めない**。
- インポートは「全置換」のみ（マージはしない — 単一端末運用の移行用途）。実行前に確認ダイアログと現行データの自動エクスポートを行う。
- `schemaVersion` が新しいJSONは拒否。古いものは Dexie のマイグレーションと同じ変換を適用して取り込む。
