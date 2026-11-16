/**
 * A thin bar down the left edge of a match card in the two teams' colours
 * (top half the first team, bottom half the second). The card must be
 * `relative overflow-hidden`.
 */
export function TeamEdge({ a, b }: { a?: string; b?: string }) {
  const ca = a ?? 'var(--color-night-line)';
  const cb = b ?? 'var(--color-night-line)';
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-y-0 left-0 w-1"
      style={{ background: `linear-gradient(${ca} 0 50%, ${cb} 50% 100%)` }}
    />
  );
}
