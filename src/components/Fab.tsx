export function Fab({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="fab" aria-label="いまの状態をのこす" onClick={onClick}>
      +
    </button>
  );
}
