import { AbstractAgent } from "@ag-ui/client";
import { EventType, type BaseEvent, type RunAgentInput } from "@ag-ui/core";
import { Observable } from "rxjs";
import { buildDemoResult } from "../../services/research";
import type { ResearchAnswer } from "../../types/chat";

const library = buildDemoResult();
const procurements = library.sections.find((section) => section.id === "similar_procurements")!.items.filter((item) => item.kind === "package").slice(0, 2);
const award = library.sections.find((section) => section.id === "historical_awards")!.items[0];
const attempts = new Map<string, number>();

function editRequest(input: RunAgentInput, question: string) {
  for (const message of [...input.messages].reverse()) {
    if (message.role !== "assistant") continue;
    for (const call of [...(message.toolCalls ?? [])].reverse()) {
      if (call.function.name !== "presentResearchAnswer") continue;
      try {
        const answer: ResearchAnswer = JSON.parse(call.function.arguments);
        if (answer.output?.kind !== "checklist" || !answer.output.items.length) continue;
        const target = answer.output.items[0];
        return { name: "editChecklist", args: {
          outputId: call.id, itemId: target.id,
          ...(/note/i.test(question) ? { notes: question.split(":").slice(1).join(":").trim() || "Confirmed in scripted test" }
            : { done: !/uncheck|not done|incomplete|undone/i.test(question) }),
        } };
      } catch { /* Ignore a partial historical tool call in this test fixture. */ }
    }
  }
  return undefined;
}

function response(input: RunAgentInput, question: string): { name: string; args: unknown } {
  if (/^(?:please\s+)?(?:mark|check|uncheck|add a note|update.*note)/i.test(question)) {
    const edit = editRequest(input, question);
    if (edit) return edit;
  }
  let answer: ResearchAnswer;
  if (/checklist/i.test(question)) {
    answer = { claims: [], output: { kind: "checklist", items: [
      { id: "permit", recordId: "readiness_checklist:F2" },
      { id: "review", suggestion: "Arrange a team review of the permit responsibilities." },
    ] } };
  } else if (/similar|\blist\b|\bmap\b|filter/i.test(question)) {
    answer = { claims: [], output: { kind: "collection", recordIds: procurements.map((item) => item.id),
      view: /\bmap\b/i.test(question) ? "map" : "list", ...(/filter/i.test(question) ? { projectId: "P127974" } : {}) } };
  } else if (/unknown|unsupported/i.test(question)) {
    answer = { claims: [{ text: "The supplied library does not establish that information.", citationIds: [] }] };
  } else if (/ambiguous|clarif|its risks/i.test(question)) {
    answer = { claims: [{ text: "Which procurement do you want to discuss?", citationIds: [] }] };
  } else {
    answer = { claims: [{ text: /slow/i.test(question) ? "GE T&D India Limited — scripted delayed answer." : /fail/i.test(question) ? "GE T&D India Limited — scripted retry succeeded." : "GE T&D India Limited", recordId: award.id, citationIds: award.citationIds }] };
  }
  return { name: "presentResearchAnswer", args: answer };
}

/** Test transport only: real AG-UI events exercise CopilotKit frontend tools without a model/key. */
export class ScriptedAgent extends AbstractAgent {
  run(input: RunAgentInput): Observable<BaseEvent> {
    return new Observable((subscriber) => {
      const userMessage = [...input.messages].reverse().find((message) => message.role === "user");
      const question = typeof userMessage?.content === "string" ? userMessage.content : "";
      const key = `${input.threadId}:${userMessage?.id ?? question}`;
      const attempt = (attempts.get(key) ?? 0) + 1;
      attempts.set(key, attempt);
      subscriber.next({ type: EventType.RUN_STARTED, threadId: input.threadId, runId: input.runId });
      const timer = setTimeout(() => {
        if (/fail/i.test(question) && attempt === 1) {
          subscriber.next({ type: EventType.RUN_ERROR, message: "Scripted temporary service failure", code: "TEST_RETRY" });
          subscriber.complete();
          return;
        }
        const tool = response(input, question);
        const toolCallId = `scripted-${input.runId}`;
        subscriber.next({ type: EventType.TOOL_CALL_START, toolCallId, toolCallName: tool.name, parentMessageId: `answer-${input.runId}` });
        subscriber.next({ type: EventType.TOOL_CALL_ARGS, toolCallId, delta: JSON.stringify(tool.args) });
        subscriber.next({ type: EventType.TOOL_CALL_END, toolCallId });
        subscriber.next({ type: EventType.RUN_FINISHED, threadId: input.threadId, runId: input.runId });
        subscriber.complete();
      }, /slow/i.test(question) ? 1500 : 20);
      return () => clearTimeout(timer);
    });
  }
}
