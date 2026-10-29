import assert from "node:assert/strict";
import test from "node:test";
import { mergeChatHistory } from "../services/chatHistory";
import type { Message } from "@ag-ui/core";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import ConversationNavigation from "../components/app/ConversationNavigation";

test("earlier turns survive partial transport snapshots and streamed IDs update without duplicates", () => {
  const first: Message[] = [{ id: "q1", role: "user", content: "First question" }, { id: "a1", role: "assistant", content: "First answer" }];
  const next = mergeChatHistory(first, [{ id: "q2", role: "user", content: "Second question" }, { id: "a2", role: "assistant", content: "Partial" }]);
  const completed = mergeChatHistory(next, [{ id: "a2", role: "assistant", content: "Complete answer" }]);
  assert.deepEqual(completed.map((message) => message.id), ["q1", "a1", "q2", "a2"]);
  assert.equal(completed.at(-1)?.content, "Complete answer");
  assert.equal(first.length, 2);
  const questions = completed.filter((message) => message.role === "user").map((message) => ({ id: message.id, label: String(message.content) }));
  const html = renderToStaticMarkup(createElement(ConversationNavigation, { questions, activeId: "q2", onSelect() {} }));
  assert.match(html, /Questions in this conversation \(2\)/);
  assert.match(html, /Go to First question/);
  assert.match(html, /Go to Second question/);
  assert.equal((html.match(/<button/g) ?? []).length, 2);
  assert.match(html, /data-near-active="true"/);
  assert.doesNotMatch(html, /class="number"/);
});
