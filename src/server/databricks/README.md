# Databricks retrieval backend

Import `databricksTools` from `@/server/databricks` in server code. The entrypoint is marked `server-only`. Internal client/tool modules are separately testable by Node; do not import them into React client components.

```ts
import { databricksTools } from "@/server/databricks";
const tools = databricksTools();
const candidates = await tools.searchDocuments({ query: "132 kV substation", limit: 5 }, signal);
const evidence = await tools.readEvidence({ chunkIds: candidates.hits.map((hit) => hit.chunkId) }, signal);
const awards = await tools.queryRecords({ table: "awards", projectIds: ["P127974"], limit: 5 }, signal);
```

The module does not change the chat agent. It does not execute notebooks, rebuild embeddings/indexes, or modify records. It calls existing Databricks OAuth, model inference, managed search and SQL APIs. These reads and query embeddings incur normal Databricks charges.

## Configuration

Use the server-only keys in `.env.example`. The client requests `sql vector-search model-serving-inference`, caches the short-lived OAuth token, shares refreshes, and refreshes once on HTTP 401. HTTP redirects are rejected. Credentials, provider error bodies and tokens are not logged.

The service principal needs table/index read grants in `databricks/backend_read_grants.sql`, CAN USE on the configured SQL warehouse, and CAN QUERY on the query-embedding endpoint. Its secret must allow the same three OAuth scopes. A working token exchange does not establish permission to query data.

## Tool behavior

- `searchDocuments`: one query embedding from the saved corpus's model, unit normalization and a hybrid search against the configured index. Optional project, source and document-type filters are validated. Returns candidates with source lineage, not verified claims.
- `readEvidence`: parameterized lookup of known chunk IDs, exact original passage text, URL/locator/hash and bounded character offsets. Missing IDs are explicit; source content is never rewritten. `nextStart` enables reading longer passages.
- `queryRecords`: fixed SELECT templates for packages, projects, awards, notices, facts, requirements, award prices, schedule events and risks. Filters use named SQL parameters. Tables, ordering and limit bounds are controlled by code. Record-level source URLs join the central Silver sources table. Package source lists indicate association, not proof for a particular claim.

SQL values retain their returned string precision (including monetary amounts). Typed arrays/structs are decoded. Truncated/multi-chunk results are rejected so callers must request smaller results. Long queries are bounded at three minutes; cancellation attempts to cancel a pending warehouse statement. A stopped warehouse may delay the first request.

The next integration must map these results into the app's validated answer/citation schema and enforce per-chat evidence IDs. Do not attach unvalidated retrieved text directly to an answer or accept arbitrary model-written SQL.

The separate [research orchestrator and streaming API](../research/README.md) now provide that mapping at `POST /api/research`. This new loop has not been run or connected to the existing chat UI yet.

## Checks

```sh
npm test
npm run check:databricks
```

The live command authenticates using `.env.local`, tests index metadata, generates one query embedding, searches a known sample, reads its source and retrieves one row from every allowed record table. It makes no chat model call. It reports only check results and sanitized error codes. It does not change permissions or resources.

### Verified on 2026-10-28

The configured `procurement-backend` OAuth identity passed token exchange, index readiness, query embedding plus hybrid search, original passage lookup with URL/locator, and all nine structured-record queries. Missing Unity Catalog permissions were resolved with USE CATALOG, USE SCHEMA and explicit SELECT grants on the procurement tables/index; no write or admin permissions were added. The existing foundation-model access worked after those grants; no endpoint ACL change was needed.

All 94 local tests, ESLint, TypeScript and the webpack production build passed. The chat agent and frontend are not connected to these tools yet, and no live chat test was run.
