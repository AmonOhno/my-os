// 型定義のみ。ロジックを置かない（docs/database/schema.md §3）

export type Domain =
  | 'health'
  | 'career'
  | 'learning'
  | 'family'
  | 'finance'
  | 'projects'
  | 'mental'
  | 'travel';

export type EntryKind = 'note' | 'mood' | 'metric' | 'event';

export type Mood = 1 | 2 | 3 | 4 | 5;

export interface MetricPayload {
  label: string;
  value: number;
  unit?: string;
}

export interface Entry {
  id: string; // ent_<uuid>
  occurredAt: string; // ISO 8601（ローカル時刻 + オフセット）
  kind: EntryKind;
  domains: Domain[]; // 1つ以上
  title?: string; // event で必須
  body?: string; // note で必須 / mood・event の一言
  mood?: Mood; // mood で必須
  payload?: MetricPayload; // metric で必須
  createdAt: string;
  updatedAt: string;
}

export interface Link {
  id: string; // lnk_<uuid>
  fromEntry: string;
  toEntry: string;
  note?: string;
  createdAt: string;
}

export interface Review {
  id: string; // rev_<uuid>
  month: string; // 'YYYY-MM'（ユニーク）
  body: string;
  createdAt: string;
  updatedAt: string;
}

export const DOMAINS: Domain[] = [
  'health',
  'career',
  'learning',
  'family',
  'finance',
  'projects',
  'mental',
  'travel',
];

export const DOMAIN_LABELS: Record<Domain, string> = {
  health: 'Health',
  career: 'Career',
  learning: 'Learning',
  family: 'Family',
  finance: 'Finance',
  projects: 'Projects',
  mental: 'Mental',
  travel: 'Travel',
};
