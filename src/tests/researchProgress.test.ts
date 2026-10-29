import assert from "node:assert/strict";
import test from "node:test";
import { createResearchProgress } from "../services/researchProgress";
import { buildDemoResult } from "../services/research";
import { validateAnswer, researchPlanSchema } from "../services/chatLibrary";
import { formatAnswer } from "../services/answerExport";
import { ScriptedAgent } from "./fixtures/scriptedAgent";
import type { ResearchRun } from "../types/chat";
import { EventType } from "@ag-ui/core";
import { HttpAgent } from "@ag-ui/client";
import { CopilotKitCore } from "@copilotkit/core";

const library = buildDemoResult();

test("real AG-UI tool events update plan, search/read activity and trusted sources", async () => {
  const agent = new ScriptedAgent({ threadId: "progress-flow" });
  const states: ResearchRun[] = [];
  const progress = createResearchProgress("progress-run", library, (state) => { states.push(state); });
  agent.subscribe(progress.subscriber);
  agent.subscribe({ onToolCallEndEvent: ({ event, toolCallName, toolCallArgs }) => {
    if (toolCallName === "presentResearchAnswer") progress.answer(validateAnswer(toolCallArgs), event.toolCallId);
  } });
  agent.addMessage({ id: "q-progress", role: "user", content: "Show research progress" });
  await agent.runAgent({ runId: "progress-run" });
  progress.complete();
  assert.ok(states.some((state) => /Searching supplied/.test(state.status)));
  assert.ok(states.some((state) => /Reading source/.test(state.status)));
  assert.ok(states.some((state) => state.tasks[0]?.status === "running"));
  assert.equal(progress.getSnapshot().tasks[0].status, "completed");
  assert.ok(progress.getSnapshot().sourceIds.length > 0);
  assert.equal(progress.getSnapshot().state, "completed");
  assert.ok(progress.getSnapshot().activity.every((item) => item.status === "completed"));
});

test("stopped progress retains partial sources and ignores late results and completion", async () => {
  const agent = new ScriptedAgent({ threadId: "progress-stop" });
  const progress = createResearchProgress("stop-run", library, () => {});
  agent.subscribe(progress.subscriber);
  agent.addMessage({ id: "q-stop", role: "user", content: "slow progress" });
  const running = agent.runAgent({ runId: "stop-run" });
  // Allow the scripted transport to deliver its initial real tool events.
  await new Promise((resolve) => setTimeout(resolve, 50));
  progress.stop();
  await running;
  const stopped = progress.getSnapshot();
  progress.complete();
  progress.answer({ claims: [] }, "late-result");
  assert.equal(progress.getSnapshot(), stopped);
  assert.equal(stopped.state, "stopped");
  assert.ok(stopped.sourceIds.length > 0);
});

test("errors and retries use separate trackers without modifying an earlier attempt", async () => {
  const agent = new ScriptedAgent({ threadId: "progress-retry" });
  agent.addMessage({ id: "q-retry", role: "user", content: "fail once" });
  const first = createResearchProgress("failed-run", library, () => {});
  const subscription = agent.subscribe(first.subscriber);
  await agent.runAgent({ runId: "failed-run" });
  assert.equal(first.getSnapshot().state, "failed");
  subscription.unsubscribe();
  const retry = createResearchProgress("retry-run", library, () => {});
  agent.subscribe(retry.subscriber);
  agent.subscribe({ onToolCallEndEvent: ({ event, toolCallName, toolCallArgs }) => {
    if (toolCallName === "presentResearchAnswer") retry.answer(validateAnswer(toolCallArgs), event.toolCallId);
  } });
  await agent.runAgent({ runId: "retry-run" });
  retry.complete();
  assert.equal(retry.getSnapshot().state, "completed");
  assert.equal(first.getSnapshot().state, "failed");
  assert.equal(agent.messages.filter((message) => message.role === "user").length, 1);
});

test("a run that hits its step limit without a public answer is not reported complete", () => {
  const progress = createResearchProgress("step-limit", library, () => {});
  progress.complete();
  assert.equal(progress.getSnapshot().state, "failed");
  assert.match(progress.getSnapshot().status, /before an answer/);
});

test("a successful checklist edit is a public result without a new research answer", async () => {
  const agent = new ScriptedAgent({ threadId: "progress-checklist-edit" });
  agent.addMessage({ id: "checklist-question", role: "user", content: "Make a checklist" });
  await agent.runAgent({ runId: "create-checklist" });
  const progress = createResearchProgress("edit-checklist", library, () => {});
  agent.subscribe(progress.subscriber);
  agent.subscribe({ onToolCallEndEvent: ({ event, toolCallName }) => {
    if (toolCallName === "editChecklist") progress.completeTool(event.toolCallId);
  } });
  agent.addMessage({ id: "edit-question", role: "user", content: "Mark the first item done" });
  await agent.runAgent({ runId: "edit-checklist" });
  progress.complete();
  assert.equal(progress.getSnapshot().state, "completed");
  assert.ok(progress.getSnapshot().activity.some((item) => item.label === "Updating checklist" && item.status === "completed"));
});

test("CopilotKit Stop aborts the live transport and the next request can run", async () => {
  let fetched!: () => void;
  const started = new Promise<void>((resolve) => { fetched = resolve; });
  let aborted = false;
  let attempt = 0;
  const agent = new HttpAgent({ url: "https://test.invalid/run", threadId: "cancel-transport", fetch: async (_url, init) => {
    const input = JSON.parse(String(init?.body));
    if (++attempt === 1) return new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => { aborted = true; reject(new DOMException("Stopped", "AbortError")); }, { once: true });
      fetched();
    });
    const events = [
      { type: "RUN_STARTED", threadId: input.threadId, runId: input.runId },
      { type: "TEXT_MESSAGE_START", messageId: "answer-after-stop", role: "assistant" },
      { type: "TEXT_MESSAGE_CONTENT", messageId: "answer-after-stop", delta: "Next request succeeded." },
      { type: "TEXT_MESSAGE_END", messageId: "answer-after-stop" },
      { type: "RUN_FINISHED", threadId: input.threadId, runId: input.runId },
    ];
    return new Response(events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(""), { headers: { "Content-Type": "text/event-stream" } });
  } });
  const core = new CopilotKitCore({ agents__unsafe_dev_only: { test: agent } });
  agent.addMessage({ id: "stop-question", role: "user", content: "Start research" });
  const progress = createResearchProgress("cancel-run", library, () => {});
  const firstSubscription = agent.subscribe(progress.subscriber);
  const running = core.runAgent({ agent, runId: "cancel-run" });
  await started;
  progress.stop(); core.stopAgent({ agent });
  await running.catch((error) => { assert.equal(error.name, "AbortError"); });
  firstSubscription.unsubscribe();
  assert.equal(aborted, true);
  assert.equal(progress.getSnapshot().state, "stopped");
  const next = createResearchProgress("next-run", library, () => {});
  agent.subscribe(next.subscriber);
  agent.addMessage({ id: "next-question", role: "user", content: "Try another question" });
  await core.runAgent({ agent, runId: "next-run" });
  next.complete();
  assert.equal(next.getSnapshot().state, "completed");
  assert.equal(progress.getSnapshot().state, "stopped");
});

test("plan and follow-up boundaries reject malformed suggestions and duplicate task IDs", () => {
  assert.equal(researchPlanSchema.safeParse({ tasks: [
    { id: "same", label: "Search", status: "running" }, { id: "same", label: "Read", status: "pending" },
  ] }).success, false);
  assert.throws(() => validateAnswer({ claims: [{ text: "Unknown", citationIds: [] }], followUpQuestions: Array(4).fill("Next question?") }));
  assert.deepEqual(validateAnswer({ claims: [{ text: "Unknown", citationIds: [] }], followUpQuestions: ["Show a checklist?"] }).followUpQuestions, ["Show a checklist?"]);
});

test("exports contain validated answer text, checklist edits and source references", () => {
  const award = library.sections.find((section) => section.id === "historical_awards")!.items[0];
  const text = formatAnswer("Who won?", [], [{ id: "answer", answer: {
    claims: [{ text: "GE T&D India Limited", recordId: award.id, citationIds: award.citationIds }],
    output: { kind: "checklist", items: [{ id: "review", suggestion: "Review scope" }] },
  } }], library, { "answer:review": { done: true, notes: "Confirmed" } });
  assert.match(text, /GE T&D India Limited/);
  assert.match(text, /\[x\] Review scope/);
  assert.match(text, /Notes: Confirmed/);
  assert.match(text, /## Sources/);
  assert.doesNotMatch(text, /Copy answer|data-component|<button/);
});

test("evidence gaps and automatic retries remain visible without rewriting an earlier attempt", async () => {
  const progress = createResearchProgress("evidence-run", library, () => {});
  const agent = new ScriptedAgent({ threadId: "assess-progress" });
  const common = { messages: agent.messages, state: agent.state, agent, input: { threadId: "assess-progress", runId: "evidence-run", messages: agent.messages, state: agent.state, tools: [], context: [], forwardedProps: {} } };
  await progress.subscriber.onToolCallStartEvent?.({ ...common, event: { type: EventType.TOOL_CALL_START, toolCallId: "check", toolCallName: "assessEvidence" } });
  await progress.subscriber.onToolCallResultEvent?.({ ...common, event: { type: EventType.TOOL_CALL_RESULT, messageId: "assessment-result", role: "tool", toolCallId: "check", content: JSON.stringify({ sufficient: false, gaps: ["Signed price"], nextQuery: "Tuensang award", additionalResearch: {} }) } });
  assert.match(progress.getSnapshot().status, /Evidence is incomplete/);
  assert.match(progress.getSnapshot().activity[0].label, /Signed price/);
  progress.fail();
  const first = progress.getSnapshot();
  const retry = createResearchProgress("retry-evidence", library, () => {}, 2, first);
  assert.match(retry.getSnapshot().status, /Retrying \(2\/3\)/);
  assert.equal(retry.getSnapshot().activity.length, 2);
  assert.equal(progress.getSnapshot(), first);
});
