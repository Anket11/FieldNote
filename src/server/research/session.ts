import { z } from "zod";
import { answerSchema, validateAnswer, researchPlanSchema, evidenceAssessmentSchema } from "../../services/chatLibrary";
import { answerOutputs, type ResearchAnswer } from "../../types/chat";
import { DatabricksError } from "../databricks/client";
import { createDatabricksTools, searchDocumentsSchema, readEvidenceSchema, queryRecordsSchema } from "../databricks/tools";
import { createEvidenceLibrary } from "./evidence";

export interface ResearchStatus { status: string; tool?: string; attempt?: number; gaps?: string[] }
export function safeResearchError(error: unknown) {
  if (error instanceof DatabricksError) return `${error.code}: ${error.message}`;
  if (error instanceof z.ZodError) return "TOOL_VALIDATION: Invalid tool arguments. Correct the field types and limits.";
  if (error instanceof Error && /^(?:EVIDENCE_LIMIT|RECORD_RESPONSE|SEARCH_LIMIT|REPEATED_SEARCH|ANSWER_VALIDATION|ASSESSMENT_REQUIRED):/.test(error.message)) return error.message;
  return "RESEARCH_FAILED: The research service could not complete this request. Retry or check the server configuration.";
}

export function createResearchSession(backend: ReturnType<typeof createDatabricksTools>, signal: AbortSignal, status: (value: ResearchStatus) => void) {
  const library = createEvidenceLibrary();
  const queries = new Set<string>();
  let searchRounds = 0;
  let assessedRevision = -1;
  let assessment: z.infer<typeof evidenceAssessmentSchema> | undefined;
  let answer: ResearchAnswer | undefined;
  let calls = 0;
  async function retrieve<T>(name: string, action: () => Promise<T>): Promise<T> {
    if (++calls > 24) throw new Error("EVIDENCE_LIMIT: Retrieval budget reached. Assess available evidence and answer with its limits.");
    for (let attempt = 1; ; attempt++) {
      signal.throwIfAborted();
      try { return await action(); }
      catch (error) {
        signal.throwIfAborted();
        const retryable = error instanceof DatabricksError && (["CONNECTION", "AUTH_CONNECTION"].includes(error.code) || error.status === 429 || (error.status ?? 0) >= 500);
        if (!retryable || attempt >= 3) throw error;
        status({ status: "The retrieval failed. Retrying…", tool: name, attempt: attempt + 1 });
        await new Promise<void>((resolve, reject) => {
          const abort = () => { clearTimeout(timer); reject(signal.reason); };
          const timer = setTimeout(() => { signal.removeEventListener("abort", abort); resolve(); }, attempt * 500);
          signal.addEventListener("abort", abort, { once: true });
          if (signal.aborted) abort();
        });
      }
    }
  }
  async function search(input: unknown) {
    const args = searchDocumentsSchema.parse(input);
    const fingerprint = JSON.stringify({ ...args, query: args.query.toLowerCase().replace(/\s+/g, " ") });
    if (searchRounds >= 3) throw new Error("SEARCH_LIMIT: Three search rounds are complete. Answer with supported facts and explicit gaps.");
    if (queries.has(fingerprint)) throw new Error("REPEATED_SEARCH: Change the query or filters instead of repeating the same search.");
    searchRounds++; queries.add(fingerprint);
    status({ status: searchRounds === 1 ? "Searching source documents…" : "Searching again with a focused query…", tool: "searchDocuments" });
    return retrieve("searchDocuments", () => backend.searchDocuments(args, signal));
  }
  const definitions = [
    { name: "reportResearchPlan", description: "Report a short public work plan. Update existing task IDs as actions complete. No private reasoning.", parameters: researchPlanSchema,
      execute: async (input: unknown) => researchPlanSchema.parse(input) },
    { name: "searchDocuments", description: "Hybrid search over the existing procurement corpus. Returns candidates, not verified claims. Read relevant chunk IDs with readEvidence. At most three focused search rounds.", parameters: searchDocumentsSchema, execute: search },
    { name: "readEvidence", description: "Read original source passages by chunk ID. Returns exact text, citation lineage, and renderRecords with usable recordId/citationIds. Only inspected evidence can support claims.", parameters: readEvidenceSchema,
      execute: async (input: unknown) => {
        const args = readEvidenceSchema.parse(input);
        status({ status: "Reading original source passages…", tool: "readEvidence" });
        const result = await retrieve("readEvidence", () => backend.readEvidence(args, signal));
        return { ...result, renderRecords: result.passages.map((passage) => library.passage(passage)) };
      } },
    { name: "queryRecords", description: "Read structured procurement tables using fixed safe filters, never SQL. Returns original records and renderRecords. query matches an exact phrase; use concise package, supplier, or project terms. Package source associations support browsing, not factual claims until passages are read.", parameters: queryRecordsSchema,
      execute: async (input: unknown) => {
        const args = queryRecordsSchema.parse(input);
        status({ status: "Searching structured procurement records…", tool: "queryRecords" });
        const result = await retrieve("queryRecords", () => backend.queryRecords(args, signal));
        return { ...result, renderRecords: library.structured(result) };
      } },
    { name: "assessEvidence", description: "Assess coverage after inspecting sources. Report concrete gaps. If insufficient, a changed nextQuery automatically searches again while rounds remain. Read its returned chunks before assessing again. After the limit, present a partial answer with gaps.", parameters: evidenceAssessmentSchema,
      execute: async (input: unknown) => {
        assessment = evidenceAssessmentSchema.parse(input);
        assessedRevision = library.revision;
        status({ status: assessment.sufficient ? "Evidence checked. Preparing the answer…" : searchRounds < 3 ? "Evidence is incomplete. Checking for more sources…" : "Evidence is incomplete. Preparing a partial answer…", tool: "assessEvidence", gaps: assessment.gaps });
        if (!assessment.sufficient && searchRounds < 3) {
          const additionalResearch = await search({ query: assessment.nextQuery, limit: 6 });
          // A new search must be inspected/assessed before presentation, even if it has no hits.
          assessedRevision = -1;
          return { ...assessment, additionalResearch, remainingSearchRounds: 3 - searchRounds };
        }
        return { ...assessment, remainingSearchRounds: 3 - searchRounds };
      } },
    { name: "presentResearchAnswer", description: "Finish with the current app's approved answer schema. Use only renderRecords IDs and their citationIds. The server validates and returns {answer, library, assessment}; the UI must load that library before rendering. A successful call ends the run.", parameters: answerSchema,
      execute: async (input: unknown) => {
        let validated: ResearchAnswer;
        try { validated = validateAnswer(input, library.snapshot()); }
        catch { throw new Error("ANSWER_VALIDATION: Invalid output or record/citation pairing. Use only IDs returned by this run's renderRecords and the approved output schema."); }
        const needsEvidence = validated.claims.some((claim) => !!claim.recordId) || answerOutputs(validated).some((output) => output.kind === "collection" || (output.kind === "checklist" && output.items.some((item) => item.recordId)));
        if (needsEvidence && (!assessment || assessedRevision !== library.revision)) throw new Error("ASSESSMENT_REQUIRED: Assess the currently inspected evidence before presenting source-backed output.");
        if (validated.claims.some((claim) => claim.citationIds.some((id) => !library.canCite(id)))) throw new Error("ANSWER_VALIDATION: Package source associations are not claim evidence. Read supporting passages and cite their renderRecord instead.");
        if (assessment && !assessment.sufficient && !validated.claims.some((claim) => !claim.recordId && !claim.citationIds.length)) throw new Error("ANSWER_VALIDATION: Include an uncited statement of the remaining evidence gaps in this partial answer.");
        signal.throwIfAborted();
        answer = validated;
        status({ status: "Preparing the requested output…", tool: "presentResearchAnswer" });
        return { answer, library: library.snapshot(), assessment: assessment ?? null };
      } },
  ];
  return {
    tools: definitions.map((definition) => ({ ...definition, execute: async (input: unknown) => {
      signal.throwIfAborted();
      if (answer) return { error: "The answer is already complete. Do not execute more tools." };
      try { return await definition.execute(input); }
      catch (error) { signal.throwIfAborted(); return { error: safeResearchError(error) }; }
    } })),
    get answered() { return !!answer; },
  };
}
