# Databricks backend data access

Import `09_backend_data_access.py` into Databricks as a Python notebook. It is standalone: it does not execute notebooks 07 or 08.

Notebook 07 persists document chunks and embeddings in Delta tables, but builds cosine and BM25 indexes in notebook-driver memory. That search cannot be called as a managed search endpoint from Next.js. Notebook 09 prepares that service layer using the saved vectors, plus the existing structured tables.

## Run

1. Use Unity Catalog-enabled compute with `databricks-sdk` installed. Start with `apply_setup=false` and `run_access_checks=false`.
2. Keep `silver_schema=main.procurement_demo_silver`, `gold_schema=main.procurement_demo_gold`, and `embedding_endpoint=databricks-gte-large-en` unless your original notebooks used different widget values. Vectors and the query model must match.
3. Inspect the validation results. A missing managed index is expected if you have only run notebooks 07/08.
4. To provision search, set `apply_setup=true`. This writes only `rag_chunks_backend_search`, creates/reuses the search endpoint, and creates/syncs `rag_chunks_backend_index`. It does not modify the upstream source tables or regenerate corpus embeddings. These resources incur Databricks charges.
5. After the index is ready, set `apply_setup=false`, supply `sql_warehouse_id`, and set `run_access_checks=true`. This checks managed search and SQL schema access using the notebook identity. A stopped warehouse can start and incur charges.
6. Copy the final non-secret configuration to the Next.js server environment. Store OAuth credentials separately in server secrets. Never expose them with a `NEXT_PUBLIC_` prefix.

If a managed index already exists elsewhere, set `index_name` to inspect it. A different source/schema is reported rather than silently modified. The automatic refresh path only manages the derived serving table defined by this notebook.

The index uses triggered sync. After updating the upstream chunks/cache, rerun APPLY to validate data, merge the derived serving rows, and trigger sync. The derived table is tagged with an ownership property; an unrelated table with the same name is not overwritten.

## Backend identity

Use a dedicated service principal. Have an administrator grant:

- `USE CATALOG` and `USE SCHEMA` on the relevant schemas.
- `SELECT` on the index and the source/structured tables the backend actually needs.
- `CAN USE` on the SQL warehouse.
- `CAN QUERY` on the same query-embedding endpoint used by notebook 07.

The notebook does not create identities, credentials, or grants. Its access checks do not establish that the backend identity works: verify that identity from the backend before enabling live research.

## Next.js tools to wire next

- `searchDocuments`: call the query-embedding endpoint, normalize the vector, then query the managed index with text + vector for hybrid retrieval.
- `readEvidence`: use a parameterized SQL query on `rag_chunks` for known chunk IDs and return original text and lineage. Use `rag_procurement_links` for explicit package associations.
- `queryRecords`: query only an allowlist of structured tables, with parameters and limits. Do not accept arbitrary model-written SQL.

The task-focused agent loop stays in Next.js. This change prepares data access; it does not replace the app's current sample-library tools. Managed search ranks candidates differently from notebook 07's exact cosine/BM25 fusion, so compare retrieval quality before switching the app.

## Local validation

```sh
python3 -m unittest discover -s databricks/tests -v
```

These checks exercise identifier validation, query-vector normalization, and the default provisioning/query guards. Spark execution and cloud permissions require a real Databricks run.

References: [index creation](https://docs.databricks.com/aws/en/ai-search/create-ai-search), [querying indexes](https://docs.databricks.com/aws/en/ai-search/query-ai-search), [SQL Statement Execution](https://databricks-sdk-py.readthedocs.io/en/latest/workspace/sql/statement_execution.html).

## Source URL inventory fix

`01_inventory_validation.py` is the updated source inventory notebook. It now reads original request URLs from Bronze `_runs/**/source_pages.json` and binds structured sources by exact Bronze path. Ambiguous paths are flagged. Document URL enrichment is unchanged. Notebook 02 already retains `source_id` and `record_id` lineage.

The 27 existing blank structured-source URLs were backfilled separately with guarded SQL, without rerunning the ingestion/extraction notebooks. Active notebook 07/08 sessions must refresh setup to reload their cached `sources` mapping. Structured records resolve their own source through `silver.sources`; their URL can be the original API response plus the existing record locator rather than a human-readable record permalink.
