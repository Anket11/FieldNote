import { z } from "zod";
import type { RunAgentInput } from "@ag-ui/core";

const message = z.object({
  id: z.string().min(1).max(200), role: z.enum(["user", "assistant", "tool"]),
  content: z.string().max(16_000).nullable().optional(),
});
export const researchRequestSchema = z.object({
  threadId: z.string().min(1).max(200), runId: z.string().min(1).max(200),
  messages: z.array(message).min(1).max(80),
}).refine((value) => value.messages.at(-1)?.role === "user" && !!value.messages.at(-1)?.content?.trim(), "The last message must be a nonempty user question.")
  .refine((value) => value.messages.reduce((size, item) => size + (item.content?.length ?? 0), 0) <= 60_000, "Conversation is too large.");

export function parseResearchRequest(value: unknown): RunAgentInput {
  const input = researchRequestSchema.parse(value);
  const messages: RunAgentInput["messages"] = [];
  // Prior tool payloads are not verified evidence and cannot inject tools or authority into a run.
  for (const item of input.messages) {
    if (!item.content?.trim()) continue;
    if (item.role === "user") messages.push({ id: item.id, role: "user", content: item.content });
    if (item.role === "assistant") messages.push({ id: item.id, role: "assistant", content: item.content });
  }
  return { threadId: input.threadId, runId: input.runId, tools: [], context: [], state: {}, forwardedProps: {},
    messages,
  };
}

export async function readResearchRequest(request: Request) {
  const limit = 256_000;
  if (Number(request.headers.get("content-length")) > limit) throw new Error("REQUEST_TOO_LARGE");
  if (!request.body) throw new Error("INVALID_REQUEST");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw new Error("REQUEST_TOO_LARGE"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return parseResearchRequest(JSON.parse(new TextDecoder().decode(bytes)));
}
