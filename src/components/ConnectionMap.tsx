import { useMemo } from 'react';
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from 'd3-force';
import type { Domain, Entry, Link } from '../types/models';

interface MapNode extends SimulationNodeDatum {
  id: string;
  label: string;
  domain: Domain; // 主領域（エントリの最初の領域）
}

interface MapEdge extends SimulationLinkDatum<MapNode> {
  id: string;
  note?: string;
}

interface Props {
  entries: Entry[];
  links: Link[];
}

const WIDTH = 360;
const HEIGHT = 320;
const NODE_R = 14;

function entryLabel(e: Entry): string {
  const text = e.title ?? e.body ?? e.payload?.label ?? (e.mood != null ? `気分 ${e.mood}` : '');
  return text.length > 6 ? `${text.slice(0, 6)}…` : text;
}

export function ConnectionMap({ entries, links }: Props) {
  const { nodes, edges } = useMemo(() => {
    const byId = new Map(entries.map((e) => [e.id, e]));
    // 両端がこの月にあるリンクだけを描く（月をまたぐ相手ノードの表示は将来検討）
    const visible = links.filter((l) => byId.has(l.fromEntry) && byId.has(l.toEntry));
    const linkedIds = new Set(visible.flatMap((l) => [l.fromEntry, l.toEntry]));
    // リンクを持たないエントリはマップに出さない（点の海にしない — connections.md §4）
    const nodes: MapNode[] = [...linkedIds].map((id) => {
      const e = byId.get(id)!;
      return { id, label: entryLabel(e), domain: e.domains[0] };
    });
    const edges: MapEdge[] = visible.map((l) => ({
      id: l.id,
      source: l.fromEntry,
      target: l.toEntry,
      note: l.note,
    }));

    const simulation = forceSimulation(nodes)
      .force(
        'link',
        forceLink<MapNode, MapEdge>(edges)
          .id((d) => d.id)
          .distance(90),
      )
      .force('charge', forceManyBody().strength(-160))
      .force('center', forceCenter(WIDTH / 2, HEIGHT / 2))
      .force('collide', forceCollide(NODE_R * 2))
      .stop();
    simulation.tick(300);

    const pad = NODE_R + 4;
    for (const n of nodes) {
      n.x = Math.max(pad, Math.min(WIDTH - pad, n.x ?? WIDTH / 2));
      n.y = Math.max(pad, Math.min(HEIGHT - pad, n.y ?? HEIGHT / 2));
    }
    return { nodes, edges };
  }, [entries, links]);

  // 空のときは静かに空のまま（空状態文言は出さない）
  if (nodes.length === 0) return null;

  return (
    <svg
      className="connection-map"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label="つながりマップ"
    >
      {edges.map((e) => {
        const s = e.source as MapNode;
        const t = e.target as MapNode;
        return (
          <g key={e.id}>
            <line className="map-link" x1={s.x} y1={s.y} x2={t.x} y2={t.y} />
            {e.note && (
              <text
                className="map-link-note"
                x={((s.x ?? 0) + (t.x ?? 0)) / 2}
                y={((s.y ?? 0) + (t.y ?? 0)) / 2 - 4}
                textAnchor="middle"
              >
                {e.note}
              </text>
            )}
          </g>
        );
      })}
      {nodes.map((n) => (
        <g key={n.id}>
          {/* TODO: ノードtap → エントリ詳細（#/entry/:id 実装後につなぐ） */}
          <circle cx={n.x} cy={n.y} r={NODE_R} style={{ fill: `var(--domain-${n.domain})` }} />
          <text className="map-node-label" x={n.x} y={(n.y ?? 0) + NODE_R + 14} textAnchor="middle">
            {n.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
