import "server-only";
import { createDatabricksTools } from "./tools";

let tools: ReturnType<typeof createDatabricksTools> | undefined;
export function databricksTools() { return tools ??= createDatabricksTools(); }
export { searchDocumentsSchema, readEvidenceSchema, queryRecordsSchema } from "./tools";
