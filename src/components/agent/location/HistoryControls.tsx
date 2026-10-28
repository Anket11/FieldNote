interface Props {
  year: number; onYear: (year: number) => void; hasScene: boolean;
  loading: boolean; error: string; onRetry: () => void;
}
export default function HistoryControls({ year, onYear, hasScene, loading, error, onRetry }: Props) {
  const currentYear = new Date().getUTCFullYear();
  return <section className="space-y-2" aria-label="Historical imagery controls">
    <div className="flex gap-2 overflow-x-auto" role="group" aria-label="Imagery year">
      {Array.from({ length: 11 }, (_, i) => currentYear - 10 + i).map((value) =>
        <button key={value} type="button" aria-pressed={year === value} onClick={() => onYear(value)}>{value}</button>)}
    </div>
    {loading && <p role="status">Loading imagery…</p>}
    {error && <p role="alert">{error} <button type="button" onClick={onRetry}>Retry</button></p>}
    {!loading && !error && !hasScene && <p>No imagery available for {year}.</p>}
  </section>;
}
