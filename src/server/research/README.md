# Backend research API

`POST /api/research` runs the procurement orchestrator on the Next.js server and streams standard AG-UI SSE events. It uses the existing server-only Gemini settings and Databricks OAuth retrieval tools. No notebooks run. The existing `/api/copilotkit` chat is unchanged until this endpoint is verified.

## Start and call it yourself

From the project directory, with `.env.local` configured:

```sh
cd /Users/anketpatil/Code/personal/procurement
npm run dev
```

If the dev server already runs, use it; do not start another process on port 3000. In another terminal:

```sh
curl --no-buffer --fail-with-body http://localhost:3000/api/research \
  -H 'Content-Type: application/json' \
  -H 'Accept: text/event-stream' \
  --data '{"threadId":"verify-substation-1","runId":"verify-run-1","messages":[{"id":"question-1","role":"user","content":"I am planning a 132 kV substation near Tuensang, Nagaland. Find similar procurements and show their sources."}]}'
```

Use a new `runId` for each request. For a follow-up, retain `threadId` and include prior user/assistant text plus the latest user message. History is request-supplied; there is no persistent server conversation store. Prior tool results are discarded as evidence and needed facts must be retrieved again. Messages must be text; files, images and system/developer messages are not accepted. Request size is capped at 256 KB and conversation text at 60,000 characters. Client tools, state, context and forwarded overrides do not grant the model tools or authority.

## Stream contract for the frontend

The SSE transport works with an AG-UI `HttpAgent` pointed at `/api/research`. Frames contain:

- `RUN_STARTED`: identifies this thread/run.
- `CUSTOM` with `name: "research.status"`: public action text, retry attempt and evidence gaps when available.
- `TOOL_CALL_START`, `TOOL_CALL_ARGS`, `TOOL_CALL_END`, `TOOL_CALL_RESULT`: operational plan, search, evidence reads, coverage checks and presentation. Arguments are model-generated proposals; a completed argument stream does **not** mean validation passed.
- `presentResearchAnswer` **successful tool result**: JSON `{ answer, library, assessment }`. `answer` uses the existing `ResearchAnswer` schema, including claims, collections, split views, checklists, location views, chat title and follow-up questions. `library` is the corresponding `ResearchResult` with retrieved records and original citations. `assessment` states coverage and remaining gaps, or is null for a clarification/location-only answer.
- `RUN_FINISHED`: a validated answer was produced. `RUN_ERROR`: the run failed or timed out. A tool result containing `error` is a recoverable tool failure, not an answer.

The frontend integration must consume the successful result, keep the returned library **with that run's answer**, and validate/render against it. Do not validate live IDs against the bundled demo library or replace a shared library that older answers still use. Do not run a duplicate frontend `presentResearchAnswer` handler on model arguments: the backend now owns validation/presentation. Use the current answer components after supplying that answer's library. This ingestion step is intentionally not connected to the current chat yet.

Raw model prose and private reasoning are not streamed as final answers. Public plan/tool/status events explain actual actions. Sources remain untrusted data; returned text is not executable HTML or instructions.

Location outputs accept `coordinates: [longitude, latitude]` for maps, 3D and historical imagery. Collection outputs accept `targetLocation: {name, coordinates: [longitude, latitude]}` for the target marker, separate from package markers. Coordinates bypass geocoding and are range-validated. Without coordinates, names still use geocoding. User-typed pairs use latitude, longitude; API arrays use longitude, latitude. Never invent coordinates for a named place.

## Loop and limits

The main orchestrator plans the requested work, rewrites focused queries, reads evidence, assesses gaps and selects the approved UI output. It has no worker agents or write tools. It does only the requested task and does not produce a fixed procurement report for every question.

- Up to three document searches (initial plus two refinements), including searches initiated by insufficient evidence.
- Up to three attempts for a transient retrieval failure; invalid arguments, permissions and authentication failures do not automatically retry.
- Maximum 18 model steps and 24 retrieval operations; evidence registry caps at 80 records/600,000 text characters. At a limit, answer with supported facts and explicit gaps.
- Evidence assessment is required after loading/changing supporting evidence. Factual claim IDs and citations must belong to this run and to the same record. Package source associations can support browsing; factual package claims require inspected passages.
- Query SQL remains fixed/parameterized. No arbitrary SQL, external browsing, saved-note edits or database writes.
- Request cancellation propagates to the agent and Databricks tools. A pending warehouse SQL statement is cancelled best effort. The route times out before five minutes and sends SSE heartbeats every 15 seconds. Hosting must support that duration and streaming.

The route is for the current local demo and inherits its lack of application authentication. Add application access control and per-user limits before exposing it publicly. Run IDs isolate in-memory evidence; they are not authorization or tenant isolation.

## Verification status

Implementation and mocked regression tests were written but **not run**, as requested. No server, model call, Databricks retrieval, chat test, build, lint or type check was started for this change. Run `npm test`, `npm run lint`, and `npm run typecheck` when you are ready. Earlier retrieval checks do not verify this new orchestration loop.

The server validates references and output structure; the model still judges relevance and semantic sufficiency. Inspect real answers and citations before relying on them. Live verification uses Gemini and Databricks credits.
