import { shiftMonth } from '../db/time';

interface Props {
  month: string; // 'YYYY-MM'
  onChange: (month: string) => void;
}

function label(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${y}年${m}月`;
}

export function MonthSwitcher({ month, onChange }: Props) {
  return (
    <div className="month-switcher">
      <button type="button" aria-label="前の月" onClick={() => onChange(shiftMonth(month, -1))}>
        ‹
      </button>
      <span className="month-switcher-label">{label(month)}</span>
      <button type="button" aria-label="次の月" onClick={() => onChange(shiftMonth(month, 1))}>
        ›
      </button>
    </div>
  );
}
