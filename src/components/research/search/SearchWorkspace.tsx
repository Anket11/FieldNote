import { useState } from "react";
import { DEMO_QUERY } from "@/services/research";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { queryChanged, search } from "@/store/researchSlice";
import SearchForm from "./SearchForm";

export default function SearchWorkspace() {
  const dispatch = useAppDispatch();
  const { query, submittedQuery, status, error, result } = useAppSelector((state) => state.research);
  const [editing, setEditing] = useState(false);
  const showForm = !result || editing;
  return (
    <>
      {showForm ? <>
        <SearchForm query={query} onQueryChange={(value) => dispatch(queryChanged(value))}
          onSearch={() => { void dispatch(search(query)).then((action) => {
            if (search.fulfilled.match(action) && action.payload) setEditing(false);
          }); }} loading={status === "loading"} error={error} />
        {result && status !== "loading" && <button type="button" onClick={() => { dispatch(queryChanged(submittedQuery)); setEditing(false); }}>Cancel edit</button>}
      </> : <div className="flex flex-wrap items-start justify-between gap-3"><p>{submittedQuery}</p><button type="button" onClick={() => setEditing(true)}>Edit search</button></div>}
      <div role="status" aria-live="polite">
        {status === "loading" && <p>Loading research…</p>}
        {status === "empty" && <section>
          <h2>No results available for this query</h2>
          <p>Try the example query.</p>
          <button type="button" onClick={() => dispatch(queryChanged(DEMO_QUERY))}>Use example query</button>
        </section>}
      </div>
    </>
  );
}
