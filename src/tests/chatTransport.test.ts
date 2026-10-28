import assert from "node:assert/strict";
import test from "node:test";
import { ScriptedAgent } from "./fixtures/scriptedAgent";
import { validateAnswer } from "../services/chatLibrary";

function presented(agent: ScriptedAgent) {
  const message = agent.messages.find((message) => message.role === "assistant");
  assert.ok(message?.role === "assistant");
  const call = message.toolCalls?.[0];
  assert.equal(call?.function.name, "presentResearchAnswer");
  return validateAnswer(JSON.parse(call!.function.arguments));
}

test("a delayed AG-UI response stays with its originating chat", async () => {
  const first = new ScriptedAgent({ threadId: "transport-slow" });
  const second = new ScriptedAgent({ threadId: "transport-second" });
  first.addMessage({ id: "slow-question", role: "user", content: "slow supplier answer" });
  const delayed = first.runAgent({ runId: "slow-run" });
  second.addMessage({ id: "checklist-question", role: "user", content: "Make checklist" });
  await second.runAgent({ runId: "checklist-run" });
  assert.equal(presented(second).output?.kind, "checklist");
  await delayed;
  assert.match(presented(first).claims[0].text, /scripted delayed answer/);
  assert.equal(presented(second).output?.kind, "checklist");
  assert.equal(second.messages.some((message) => message.id === "slow-question"), false);
});

test("AG-UI run errors are observable and retry retains one user question", async () => {
  const agent = new ScriptedAgent({ threadId: "transport-retry" });
  let error = "";
  agent.subscribe({ onRunErrorEvent: ({ event }) => { error = event.message; } });
  agent.addMessage({ id: "retry-question", role: "user", content: "fail once" });
  await agent.runAgent({ runId: "first-attempt" });
  assert.match(error, /Scripted temporary service failure/);
  assert.equal(agent.messages.filter((message) => message.role === "assistant").length, 0);
  await agent.runAgent({ runId: "retry-attempt" });
  assert.match(presented(agent).claims[0].text, /scripted retry succeeded/);
  assert.equal(agent.messages.filter((message) => message.role === "user").length, 1);
});
