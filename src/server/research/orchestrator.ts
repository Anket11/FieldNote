import { BuiltInAgent, convertAISDKStream, convertMessagesToVercelAISDKMessages, convertToolDefinitionsToVercelAITools, resolveModel } from "@copilotkit/runtime/v2";
import { stepCountIs, streamText } from "ai";
import { EventType, type BaseEvent } from "@ag-ui/core";
import type { createDatabricksTools } from "../databricks/tools";
import { createResearchSession, safeResearchError } from "./session";
import { orchestratorInstructions } from "./prompt";

export function createResearchOrchestrator(backend: ReturnType<typeof createDatabricksTools>) {
  return new BuiltInAgent({
    type: "custom",
    factory: async function* ({ input, abortSignal }) {
      // Tools and evidence live inside this run, never in a shared agent/global store.
      let open = true;
      const events = new ReadableStream<BaseEvent>({
        start(controller) {
          const emit = (event: BaseEvent) => { if (open && !abortSignal.aborted) controller.enqueue(event); };
          const status = (value: object) => emit({ type: EventType.CUSTOM, name: "research.status", value });
          const session = createResearchSession(backend, abortSignal, status);
          void (async () => {
            try {
              status({ status: "Planning the requested research…" });
              const result = streamText({
                model: resolveModel(`google:${process.env.GEMINI_MODEL || "gemini-3.8-flash"}`, process.env.GEMINI_API_KEY),
                system: orchestratorInstructions,
                // Client tool definitions, state and forwarded prompt/model overrides are never used.
                messages: convertMessagesToVercelAISDKMessages(input.messages),
                tools: convertToolDefinitionsToVercelAITools(session.tools),
                toolChoice: "required", stopWhen: [stepCountIs(18), () => session.answered],
                maxOutputTokens: 6000, maxRetries: 2, abortSignal,
                onError: () => { /* The enclosing stream returns sanitized errors only. */ },
              });
              for await (const event of convertAISDKStream(result.fullStream, abortSignal)) {
                // Only validated answer tool results are public answers; never stream private reasoning.
                if (event.type.startsWith("REASONING") || event.type.startsWith("TEXT_MESSAGE")) continue;
                emit(event);
              }
              if (!abortSignal.aborted && !session.answered) throw new Error("The agent ended without a validated answer.");
              if (session.answered) status({ status: "Research complete." });
              if (open) controller.close();
            } catch (error) {
              if (open) controller.error(new Error(safeResearchError(error)));
            } finally { open = false; }
          })();
        },
        cancel() { open = false; },
      });
      const reader = events.getReader();
      try {
        while (!abortSignal.aborted) {
          const { done, value } = await reader.read();
          if (done) break;
          yield value;
        }
      } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
    },
  });
}
