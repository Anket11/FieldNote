import { DEMO_QUERY } from "@/services/research";
interface Props {
  query: string; onQueryChange: (query: string) => void; onSearch: () => void;
  loading: boolean; error?: string;
}
export default function SearchForm({ query, onQueryChange, onSearch, loading, error }: Props) {
  return <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); onSearch(); }}>
    <label className="block" htmlFor="procurement-query">Describe your procurement</label>
    <textarea id="procurement-query" className="block w-full max-w-3xl" rows={4} value={query}
      onChange={(event) => onQueryChange(event.target.value)} aria-invalid={!!error}
      aria-describedby={error ? "search-error demo-limit" : "demo-limit"} />
    <div className="flex flex-wrap gap-3">
      <button type="submit" disabled={loading}>{loading ? "Searching…" : "Search"}</button>
      <button type="button" disabled={loading} onClick={() => onQueryChange(DEMO_QUERY)}>Use demo query</button>
    </div>
    {error && <p id="search-error" role="alert">{error}</p>}
    <p id="demo-limit">Saved demo evidence only. Search supports the supplied demo query (case and whitespace differences are accepted); other input is not researched.</p>
  </form>;
}
