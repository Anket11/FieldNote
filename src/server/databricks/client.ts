import { Buffer } from "node:buffer";
import { z } from "zod";

const name = z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/);
const schemaName = z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*\.[A-Za-z_][A-Za-z0-9_]*$/);
const fullName = z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*\.[A-Za-z_][A-Za-z0-9_]*\.[A-Za-z_][A-Za-z0-9_]*$/);
const settings = z.object({
  DATABRICKS_HOST: z.string().url().refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && /\.(databricks\.com|azuredatabricks\.net)$/.test(url.hostname) && !url.username && !url.password && url.pathname === "/" && !url.search && !url.hash;
    } catch { return false; }
  }),
  DATABRICKS_CLIENT_ID: z.string().min(1), DATABRICKS_CLIENT_SECRET: z.string().min(1),
  DATABRICKS_SQL_WAREHOUSE_ID: z.string().regex(/^[a-f0-9]+$/i),
  DATABRICKS_SEARCH_INDEX: fullName,
  DATABRICKS_EMBEDDING_ENDPOINT: z.string().regex(/^[\w.-]+$/),
  DATABRICKS_EMBEDDING_DIMENSION: z.coerce.number().int().min(1).max(16384),
  DATABRICKS_SILVER_SCHEMA: schemaName.default("main.procurement_demo_silver"),
  DATABRICKS_GOLD_SCHEMA: schemaName.default("main.procurement_demo_gold"),
});
export type DatabricksConfig = z.infer<typeof settings>;
export function databricksConfig(env: Record<string, string | undefined> = process.env): DatabricksConfig {
  const result = settings.safeParse(env);
  if (!result.success) throw new DatabricksError("CONFIGURATION", "Missing or invalid Databricks settings: " + [...new Set(result.error.issues.map((issue) => issue.path[0]))].join(", "));
  return { ...result.data, DATABRICKS_HOST: result.data.DATABRICKS_HOST.replace(/\/$/, "") };
}
export function sqlIdentifier(value: string) {
  return value.split(".").map((part) => "`" + name.parse(part) + "`").join(".");
}
export class DatabricksError extends Error {
  constructor(public code: string, message: string, public status?: number) { super(message); this.name = "DatabricksError"; }
}
const tokenSchema = z.object({ access_token: z.string().min(1), expires_in: z.number().positive(), token_type: z.string().refine((value) => value.toLowerCase() === "bearer") });
const statementSchema = z.object({
  statement_id: z.string().optional(), status: z.object({ state: z.string(), error: z.object({ error_code: z.string().optional(), message: z.string().optional() }).optional() }),
  manifest: z.object({ truncated: z.boolean().optional(), total_chunk_count: z.number().optional(), schema: z.object({ columns: z.array(z.object({ name: z.string(), type_name: z.string().optional(), type_text: z.string().optional() })) }) }).optional(),
  result: z.object({ data_array: z.array(z.array(z.unknown())).optional(), next_chunk_index: z.number().nullable().optional() }).optional(),
});
export interface SqlParameter { name: string; value: string; type?: "STRING" | "INT" }

export function createDatabricksClient(config: DatabricksConfig, request: typeof fetch = fetch) {
  let cached: { value: string; expires: number } | undefined;
  let refreshing: Promise<string> | undefined;
  async function token(): Promise<string> {
    if (cached && cached.expires > Date.now() + 60_000) return cached.value;
    if (!refreshing) refreshing = (async () => {
      let response: Response;
      try {
        response = await request(config.DATABRICKS_HOST + "/oidc/v1/token", {
          method: "POST", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(15_000),
          headers: { Authorization: "Basic " + Buffer.from(config.DATABRICKS_CLIENT_ID + ":" + config.DATABRICKS_CLIENT_SECRET).toString("base64"), "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ grant_type: "client_credentials", scope: "sql vector-search model-serving-inference" }),
        });
      } catch { throw new DatabricksError("AUTH_CONNECTION", "Could not reach Databricks OAuth. Check the workspace host and connection."); }
      if (!response.ok) throw new DatabricksError("AUTHENTICATION", "Databricks OAuth failed. Check the client ID, secret, workspace assignment, and the three configured API scopes.", response.status);
      const parsed = tokenSchema.safeParse(await response.json().catch(() => null));
      if (!parsed.success) throw new DatabricksError("AUTH_RESPONSE", "Databricks returned an invalid OAuth response.");
      cached = { value: parsed.data.access_token, expires: Date.now() + parsed.data.expires_in * 1000 };
      return cached.value;
    })().finally(() => { refreshing = undefined; });
    return refreshing;
  }
  async function api(path: string, body?: object, signal?: AbortSignal): Promise<unknown> {
    if (!path.startsWith("/api/") && !path.startsWith("/serving-endpoints/")) throw new DatabricksError("API_PATH", "Unsupported Databricks API path.");
    for (let attempt = 0; attempt < 2; attempt++) {
      const credential = await token();
      signal?.throwIfAborted();
      let response: Response;
      try {
        response = await request(config.DATABRICKS_HOST + path, {
          method: body ? "POST" : "GET", redirect: "error", cache: "no-store",
          headers: { Authorization: "Bearer " + credential, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined,
          signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(30_000)]) : AbortSignal.timeout(30_000),
        });
      } catch {
        signal?.throwIfAborted();
        throw new DatabricksError("CONNECTION", "Databricks request timed out or could not connect.");
      }
      if (response.status === 401 && attempt === 0) { if (cached?.value === credential) cached = undefined; continue; }
      if (!response.ok) throw new DatabricksError(response.status === 403 ? "PERMISSION_DENIED" : "API_REQUEST", response.status === 403
        ? "Databricks denied access. Check the service principal's scopes and resource permissions." : "Databricks API request failed (HTTP " + response.status + ").", response.status);
      try { return await response.json(); } catch { throw new DatabricksError("API_RESPONSE", "Databricks returned an invalid JSON response."); }
    }
    throw new DatabricksError("AUTHENTICATION", "Databricks rejected the refreshed credential.");
  }
  async function sql(statement: string, parameters: SqlParameter[] = [], signal?: AbortSignal): Promise<Record<string, unknown>[]> {
    // Only fixed SELECT statements from the retrieval tools call this internal method.
    let id: string | undefined;
    let completed = false;
    const deadline = AbortSignal.timeout(180_000);
    const combined = signal ? AbortSignal.any([signal, deadline]) : deadline;
    try {
      let reply = statementSchema.parse(await api("/api/2.0/sql/statements", {
        warehouse_id: config.DATABRICKS_SQL_WAREHOUSE_ID, statement, parameters,
        wait_timeout: "0s", on_wait_timeout: "CONTINUE", disposition: "INLINE", format: "JSON_ARRAY", byte_limit: 1_000_000,
      }, combined));
      id = reply.statement_id;
      while (["PENDING", "RUNNING"].includes(reply.status.state)) {
        if (!id) throw new DatabricksError("SQL_RESPONSE", "Databricks omitted the pending statement ID.");
        await new Promise<void>((resolve, reject) => {
          const abort = () => { clearTimeout(timer); reject(combined.reason); };
          const timer = setTimeout(() => { combined.removeEventListener("abort", abort); resolve(); }, 1000);
          combined.addEventListener("abort", abort, { once: true });
          if (combined.aborted) abort();
        });
        reply = statementSchema.parse(await api("/api/2.0/sql/statements/" + encodeURIComponent(id), undefined, combined));
      }
      if (reply.status.state !== "SUCCEEDED") {
        const errorClass = reply.status.error?.message?.match(/\[([A-Z][A-Z0-9_.]+)\]/)?.[1];
        throw new DatabricksError("SQL_" + (errorClass ?? reply.status.error?.error_code ?? reply.status.state),
          "Databricks SQL did not succeed. Check warehouse and table permissions, or narrow the request.");
      }
      completed = true;
      if (reply.manifest?.truncated || (reply.manifest?.total_chunk_count ?? 0) > 1 || reply.result?.next_chunk_index != null)
        throw new DatabricksError("SQL_RESULT_TOO_LARGE", "The result is too large. Request fewer records or shorter passages.");
      const columns = reply.manifest?.schema.columns;
      if (!columns) throw new DatabricksError("SQL_RESPONSE", "Databricks omitted the result schema.");
      return (reply.result?.data_array ?? []).map((row) => {
        if (row.length !== columns.length) throw new DatabricksError("SQL_RESPONSE", "Databricks returned a mismatched result row.");
        return Object.fromEntries(columns.map((column, index) => {
          const value = row[index];
          if (typeof value === "string" && /^(ARRAY|MAP|STRUCT)\b/i.test(column.type_name ?? column.type_text ?? "")) {
            try { return [column.name, JSON.parse(value)]; } catch { throw new DatabricksError("SQL_RESPONSE", "Databricks returned invalid structured data."); }
          }
          return [column.name, value];
        }));
      });
    } finally {
      if (id && !completed) await api("/api/2.0/sql/statements/" + encodeURIComponent(id) + "/cancel", {}, AbortSignal.timeout(5000)).catch(() => {});
    }
  }
  return { config, api, sql, authenticate: async () => { await token(); } };
}
export type DatabricksClient = ReturnType<typeof createDatabricksClient>;
