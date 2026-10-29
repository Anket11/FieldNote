import assert from "node:assert/strict";
import test from "node:test";
import { createDatabricksClient, databricksConfig, DatabricksError } from "../server/databricks/client";
import { createDatabricksTools } from "../server/databricks/tools";

const config = () => databricksConfig({
  DATABRICKS_HOST: "https://example.cloud.databricks.com", DATABRICKS_CLIENT_ID: "test-client", DATABRICKS_CLIENT_SECRET: "test-secret",
  DATABRICKS_SQL_WAREHOUSE_ID: "abc123", DATABRICKS_SEARCH_INDEX: "main.gold.chunks_index",
  DATABRICKS_EMBEDDING_ENDPOINT: "embedding-model", DATABRICKS_EMBEDDING_DIMENSION: "2",
});
const auth = (value = "test-token", expires = 3600) => Response.json({ access_token: value, token_type: "Bearer", expires_in: expires });
const success = (rows: unknown[][] = [["c1"]]) => Response.json({ statement_id: "statement-1", status: { state: "SUCCEEDED" }, manifest: { schema: { columns: [{ name: "chunk_id" }] } }, result: { data_array: rows } });

test("Databricks settings reject unsafe hosts and errors never contain credential values", () => {
  assert.throws(() => databricksConfig({ DATABRICKS_HOST: "not-a-url" }), DatabricksError);
  assert.throws(() => databricksConfig({ DATABRICKS_CLIENT_SECRET: "do-not-log-me", DATABRICKS_HOST: "http://localhost" }), (error) => {
    assert.ok(error instanceof DatabricksError);
    assert.doesNotMatch(error.message, /do-not-log-me/); return true;
  });
});

test("OAuth refresh is shared, cached and requests only the selected scopes", async () => {
  let tokens = 0;
  const request: typeof fetch = async (input, init) => {
    assert.match(String(input), /\/oidc\/v1\/token$/);
    assert.equal(new Headers(init?.headers).get("Authorization"), "Basic dGVzdC1jbGllbnQ6dGVzdC1zZWNyZXQ=");
    assert.equal(String(init?.body), "grant_type=client_credentials&scope=sql+vector-search+model-serving-inference");
    tokens++; return auth();
  };
  const client = createDatabricksClient(config(), request);
  await Promise.all([client.authenticate(), client.authenticate(), client.authenticate()]);
  await client.authenticate();
  assert.equal(tokens, 1);
});

test("a rejected token refreshes once, and forbidden response bodies stay private", async () => {
  let tokens = 0, calls = 0;
  const request: typeof fetch = async (input) => {
    if (String(input).endsWith("/token")) return auth("token-" + ++tokens);
    return ++calls === 1 ? new Response("secret provider context", { status: 401 }) : Response.json({ ok: true });
  };
  assert.deepEqual(await createDatabricksClient(config(), request).api("/api/test"), { ok: true });
  assert.equal(tokens, 2);
  const denied: typeof fetch = async (input) => String(input).endsWith("/token") ? auth() : new Response("secret provider context", { status: 403 });
  await assert.rejects(createDatabricksClient(config(), denied).api("/api/test"), (error) => {
    assert.ok(error instanceof DatabricksError); assert.equal(error.code, "PERMISSION_DENIED");
    assert.doesNotMatch(error.message, /secret provider context/); return true;
  });
});

test("SQL binds parameters, polls pending results, and decodes typed arrays", async () => {
  let submitted: Record<string, unknown> = {};
  const request: typeof fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/token")) return auth();
    if (url.endsWith("/statements")) { submitted = JSON.parse(String(init?.body)); return Response.json({ statement_id: "statement-1", status: { state: "PENDING" } }); }
    return Response.json({ status: { state: "SUCCEEDED" }, manifest: { schema: { columns: [{ name: "ids", type_name: "ARRAY" }, { name: "amount", type_name: "DECIMAL" }] } }, result: { data_array: [['["a","b"]', "693401152.00"]] } });
  };
  const rows = await createDatabricksClient(config(), request).sql("SELECT :id", [{ name: "id", value: "a' OR 1=1" }]);
  assert.equal(submitted.statement, "SELECT :id");
  assert.deepEqual(submitted.parameters, [{ name: "id", value: "a' OR 1=1" }]);
  assert.deepEqual(rows, [{ ids: ["a", "b"], amount: "693401152.00" }]);
});

test("SQL cancels pending work when the caller stops and rejects truncated output", async () => {
  const controller = new AbortController();
  let cancelled = false;
  const request: typeof fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/token")) return auth();
    if (url.endsWith("/cancel")) { cancelled = true; return Response.json({}); }
    setTimeout(() => controller.abort(), 5);
    return Response.json({ statement_id: "statement-1", status: { state: "PENDING" } });
  };
  await assert.rejects(createDatabricksClient(config(), request).sql("SELECT 1", [], controller.signal));
  assert.equal(cancelled, true);
  const truncated: typeof fetch = async (input) => String(input).endsWith("/token") ? auth() : Response.json({ status: { state: "SUCCEEDED" }, manifest: { truncated: true, schema: { columns: [] } } });
  await assert.rejects(createDatabricksClient(config(), truncated).sql("SELECT 1"), (error) => error instanceof DatabricksError && error.code === "SQL_RESULT_TOO_LARGE");
});

test("search normalizes existing-model vectors, uses bounded filters and validates evidence fields", async () => {
  let body: Record<string, unknown> = {};
  const request: typeof fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/token")) return auth();
    if (url.endsWith("/invocations")) return Response.json({ data: [{ index: 0, embedding: [3, 4] }] });
    body = JSON.parse(String(init?.body));
    return Response.json({ manifest: { columns: ["chunk_id", "text", "source_id", "source_url", "score"].map((name) => ({ name })) }, result: { data_array: [["c1", "Original text", "s1", "https://example.org/source", 0.8]] } });
  };
  const tools = createDatabricksTools(createDatabricksClient(config(), request));
  const result = await tools.searchDocuments({ query: "substation", limit: 3, projectIds: ["P127974"] });
  assert.deepEqual(body.query_vector, [0.6, 0.8]); assert.equal(body.query_type, "HYBRID");
  assert.equal(body.filters_json, '{"source_project_id":["P127974"]}');
  assert.equal(result.hits[0].citation.url, "https://example.org/source");
  await assert.rejects(tools.searchDocuments({ query: "x", limit: 100 }));
});

test("record tools allow only fixed tables and keep model input out of SQL", async () => {
  let statement = "", parameters: unknown;
  const client = createDatabricksClient(config(), async () => success());
  const tools = createDatabricksTools({ ...client, sql: async (query, values) => { statement = query; parameters = values; return []; } });
  await tools.queryRecords({ table: "awards", query: "x' OR 1=1", packageIds: ["package; DROP TABLE x"], limit: 3 });
  assert.doesNotMatch(statement, /OR 1=1|DROP TABLE/);
  assert.match(statement, /LEFT JOIN.*sources/);
  assert.deepEqual(parameters, [{ name: "package0", value: "package; DROP TABLE x" }, { name: "query", value: "x' OR 1=1" }]);
  await tools.queryRecords({ table: "requirements" }); assert.match(statement, /ORDER BY t\.`fact_id`/);
  await assert.rejects(tools.queryRecords({ table: "rag_embedding_cache" }));
  await assert.rejects(tools.queryRecords({ table: "awards", sql: "DELETE FROM awards" }));
});

test("source reads return original text, bounded continuation offsets, and explicit missing IDs", async () => {
  const client = createDatabricksClient(config(), async () => success());
  const tools = createDatabricksTools({ ...client, sql: async (statement, parameters) => {
    assert.match(statement, /SUBSTRING\(c.text,:start \+ 1,:size\)/); assert.match(statement, /c.chunk_id IN \(:chunk0,:chunk1\)/);
    assert.ok(parameters?.some((value) => value.name === "chunk1" && value.value === "missing"));
    return [{ chunk_id: "c1", text: "Exact source text.", source_id: "s1", citation_url: "https://example.org/source", source_locator: "/page/3", total_characters: "8000" }];
  } });
  const result = await tools.readEvidence({ chunkIds: ["c1", "missing"] });
  assert.equal(result.passages[0].text, "Exact source text."); assert.equal(result.passages[0].nextStart, 6000);
  assert.deepEqual(result.missingChunkIds, ["missing"]);
});
