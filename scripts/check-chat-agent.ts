import { answerOutputs } from "../src/types/chat";
// Live runtime smoke check. Requires the app's dev server and its server-side Gemini configuration.
import { zodToJsonSchema } from "zod-to-json-schema";
import { answerSchema, validateAnswer } from "../src/services/chatLibrary";
import { checklistChangeSchema } from "../src/services/chatActions";

import { DEMO_QUERY } from "../src/services/demoQuery";
const question = process.argv[2] ?? DEMO_QUERY;
function redact(message: string) {
  const key = process.env.GEMINI_API_KEY;
  return (key ? message.replaceAll(key, "<REDACTED>") : message)
    .replace(/AIza[\w-]+/g, "<REDACTED>").replace(/Bearer\s+[^\s"']+/gi, "Bearer <REDACTED>");
}
async function check() {
  const response = await fetch("http://127.0.0.1:3000/api/copilotkit/agent/default/run", {
    method: "POST", headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify({ threadId: crypto.randomUUID(), runId: crypto.randomUUID(), state: {}, context: [], forwardedProps: {},
      messages: [{ id: crypto.randomUUID(), role: "user", content: question }],
      tools: [
        { name: "presentResearchAnswer", description: "Display the requested cited answer using approved components.", parameters: zodToJsonSchema(answerSchema) },
        { name: "editChecklist", description: "Edit an existing checklist only on explicit instruction.", parameters: zodToJsonSchema(checklistChangeSchema) },
      ],
    }), signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) throw new Error(`Runtime HTTP ${response.status}: ${redact(await response.text())}`);
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const calls = new Map<string, { name: string; args: string }>();
  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done }).replaceAll("\r", "");
    const frames = buffer.split("\n\n"); buffer = frames.pop() ?? "";
    for (const frame of frames) {
      const data = frame.split("\n").filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim()).join("\n");
      if (!data || data === "[DONE]") continue;
      const event = JSON.parse(data);
      if (event.type === "RUN_ERROR") throw new Error(redact(event.message));
      if (event.type === "TOOL_CALL_START") calls.set(event.toolCallId, { name: event.toolCallName, args: "" });
      if (event.type === "TOOL_CALL_ARGS") { const call = calls.get(event.toolCallId); if (call) call.args += event.delta; }
      if (event.type === "TOOL_CALL_END") {
        const call = calls.get(event.toolCallId);
        if (call?.name === "presentResearchAnswer") {
          const answer = validateAnswer(JSON.parse(call.args));
          if (/similar procurements/i.test(question) && !answerOutputs(answer).some((output) => output.kind === "collection")) throw new Error("The request did not produce a procurement list.");
          console.log(JSON.stringify({ passed: true, outputs: answerOutputs(answer).map((output) => output.kind), claims: answer.claims.length }));
          await reader.cancel(); return;
        }
      }
    }
    if (done) break;
  }
  throw new Error("The runtime finished without a validated answer.");
}
check().catch((error: unknown) => { console.error(redact(error instanceof Error ? error.message : "Runtime check failed.")); process.exitCode = 1; });
