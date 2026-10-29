// Direct retrieval checks only: no chat model, notebook execution, writes, or resource creation.
import { createDatabricksClient, databricksConfig, DatabricksError, sqlIdentifier } from "../src/server/databricks/client";
import { createDatabricksTools } from "../src/server/databricks/tools";

function failure(error: unknown) {
  return error instanceof DatabricksError ? `${error.code}${error.status ? ` (HTTP ${error.status})` : ""}: ${error.message}`
    : "Unexpected retrieval or response-validation error. No provider payload was logged.";
}
async function check() {
  const client = createDatabricksClient(databricksConfig());
  const tools = createDatabricksTools(client);
  let failures = 0;
  async function step(label: string, action: () => Promise<void>) {
    try { await action(); console.log("PASS " + label); return true; }
    catch (error) { failures++; console.error("FAIL " + label + ": " + failure(error)); return false; }
  }
  console.log("Checking configured service-principal credentials (values hidden).");
  if (!await step("OAuth token exchange", () => client.authenticate())) { process.exitCode = 1; return; }
  await step("index access and readiness", async () => {
    const descriptor = await client.api("/api/2.0/vector-search/indexes/" + encodeURIComponent(client.config.DATABRICKS_SEARCH_INDEX));
    if (!descriptor || typeof descriptor !== "object" || !("status" in descriptor) || !descriptor.status || typeof descriptor.status !== "object" || !("ready" in descriptor.status) || descriptor.status.ready !== true)
      throw new DatabricksError("INDEX_NOT_READY", "The search index is not ready.");
  });
  let chunkId: string | undefined;
  await step("query embedding + hybrid search", async () => {
    const result = await tools.searchDocuments({ query: "132 kV substation Tuensang", limit: 3 });
    if (!result.hits.length) throw new DatabricksError("NO_SEARCH_RESULTS", "The known sample query returned no candidates.");
    chunkId = result.hits[0].chunkId;
  });
  await step("SQL source lookup: original text, URL and locator", async () => {
    if (!chunkId) {
      const rows = await client.sql(`SELECT chunk_id FROM ${sqlIdentifier(client.config.DATABRICKS_GOLD_SCHEMA)}.rag_chunks ORDER BY chunk_id LIMIT 1`);
      if (typeof rows[0]?.chunk_id === "string") chunkId = rows[0].chunk_id;
    }
    if (!chunkId) throw new DatabricksError("NO_SOURCE", "No known chunk was available for source lookup.");
    const result = await tools.readEvidence({ chunkIds: [chunkId] });
    if (!result.passages[0]?.text || !result.passages[0].citation.url || !result.passages[0].citation.locator)
      throw new DatabricksError("INCOMPLETE_CITATION", "Source lookup did not return text, URL and locator.");
  });
  for (const table of ["packages", "projects", "awards", "notices", "facts", "requirements", "awardPrices", "scheduleEvents", "risks"] as const) {
    await step("structured retrieval: " + table, async () => {
      const result = await tools.queryRecords({ table, limit: 1 });
      if (!result.records.length) throw new DatabricksError("EMPTY_TABLE", "No records returned for " + table + ".");
    });
  }
  console.log(failures ? `${failures} access/retrieval checks need attention. Agent loop remains unchanged.` : "All retrieval checks passed. Agent loop remains unchanged.");
  if (failures) process.exitCode = 1;
}
check().catch((error: unknown) => { console.error("FAIL " + failure(error)); process.exitCode = 1; });
