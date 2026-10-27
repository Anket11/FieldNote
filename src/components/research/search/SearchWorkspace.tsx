import { DEMO_QUERY } from "@/services/research";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { queryChanged, search } from "@/store/researchSlice";
import SearchForm from "./SearchForm";

export default function SearchWorkspace() {
  const dispatch = useAppDispatch();
  const { query, submittedQuery, status, error } = useAppSelector((state) => state.research);

  return (
    <>
      <SearchForm
        query={query}
        onQueryChange={(value) => dispatch(queryChanged(value))}
        onSearch={() => { void dispatch(search(query)); }}
        loading={status === "loading"}
        error={error}
      />
      <div role="status" aria-live="polite">
        {status === "loading" && <p>Loading saved research…</p>}
        {status === "empty" && (
          <section>
            <h2>No saved results for this query</h2>
            <p>Submitted query: {submittedQuery}</p>
            <p>This demo does not research arbitrary input.</p>
            <button type="button" onClick={() => dispatch(queryChanged(DEMO_QUERY))}>
              Use demo query
            </button>
          </section>
        )}
      </div>
    </>
  );
}
