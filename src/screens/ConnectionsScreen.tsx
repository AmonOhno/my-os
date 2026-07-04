export function ConnectionsScreen() {
  const now = new Date();
  return (
    <div className="screen">
      <h1 className="screen-title">つながり</h1>
      <p className="caption">
        ‹ {now.getFullYear()}年{now.getMonth() + 1}月 ›
      </p>
      {/* TODO: つながりマップ（SVG + d3-force）— docs/feature/connections.md §4 */}
      {/* TODO: ふりかえりカード — docs/feature/connections.md §5 */}
    </div>
  );
}
