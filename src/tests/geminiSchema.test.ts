import assert from "node:assert/strict";
import test from "node:test";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { JSONSchema7 } from "@ai-sdk/provider";
import { zodToJsonSchema } from "zod-to-json-schema";
import { answerSchema, libraryQuerySchema, sourceQuerySchema, researchPlanSchema, evidenceAssessmentSchema } from "../services/chatLibrary";
import { checklistChangeSchema } from "../services/chatActions";

test("real Google tool conversion accepts the frontend and library schemas before making a request", async () => {
  let requested = false;
  const provider = createGoogleGenerativeAI({ apiKey: "test-key", fetch: async () => {
    requested = true;
    return Response.json({ candidates: [{ content: { role: "model", parts: [{ text: "ok" }] }, finishReason: "STOP" }] });
  } });
  const tools = [
    ["presentResearchAnswer", answerSchema], ["editChecklist", checklistChangeSchema],
    ["lookupLibrary", libraryQuerySchema], ["readSources", sourceQuerySchema],
    ["reportResearchPlan", researchPlanSchema], ["assessEvidence", evidenceAssessmentSchema],
  ] as const;
  await provider("gemini-3.8-flash").doGenerate({
    prompt: [{ role: "user", content: [{ type: "text", text: "Find similar procurements." }] }],
    tools: tools.map(([name, schema]) => ({ type: "function", name, inputSchema: zodToJsonSchema(schema) as JSONSchema7 })),
  });
  assert.equal(requested, true);
});
