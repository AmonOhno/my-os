import type { Domain } from '../types/models';
import { DOMAIN_LABELS } from '../types/models';

export function DomainChip({ domain }: { domain: Domain }) {
  return (
    <span
      className="domain-chip"
      style={{ '--chip-color': `var(--domain-${domain})` } as React.CSSProperties}
    >
      {DOMAIN_LABELS[domain]}
    </span>
  );
}
