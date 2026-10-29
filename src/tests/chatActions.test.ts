import assert from "node:assert/strict";
import test from "node:test";
import { validateChecklistChange } from "../services/chatActions";
import type { ResearchAnswer } from "../types/chat";

test("checklist changes require an explicit request and an item from the same chat", () => {
  const answers: Record<string, ResearchAnswer> = { preparation: { claims: [], output: { kind: "checklist", items: [{ id: "permit", recordId: "readiness_checklist:F2" }] } } };
  const before = JSON.stringify(answers);
  assert.deepEqual(validateChecklistChange({ outputId: "preparation", itemId: "permit", done: true }, answers, "Please mark the permit action complete"), { key: "preparation:permit", changes: { done: true } });
  assert.throws(() => validateChecklistChange({ outputId: "preparation", itemId: "permit", done: true }, answers, "What are the permit responsibilities?"), /completion/);
  assert.throws(() => validateChecklistChange({ outputId: "another-chat", itemId: "permit", done: true }, answers, "Mark the permit action complete"), /Unknown checklist/);
  assert.throws(() => validateChecklistChange({ outputId: "preparation", itemId: "invented", notes: "Done" }, answers, "Add a note"), /Unknown checklist/);
  for (const request of ["Add a preparation checklist", "Please add a map", "Please write a summary", "Add a note: check if this is complete"]) {
    assert.throws(() => validateChecklistChange({ outputId: "preparation", itemId: "permit", done: true }, answers, request), /completion/);
  }
  assert.throws(() => validateChecklistChange({ outputId: "preparation", itemId: "permit", notes: "invented" }, answers, "Please mark the permit done"), /note instructions/);
  assert.deepEqual(validateChecklistChange({ outputId: "preparation", itemId: "permit", done: false }, answers, "Uncheck the permit item").changes, { done: false });
  assert.equal(JSON.stringify(answers), before);
});

test("checklist changes reach later sections without changing the legacy edit key", () => {
  const answers: Record<string, ResearchAnswer> = { answer: { claims: [], outputs: [
    { kind: "collection", title: "Packages", recordIds: [], view: "list" },
    { kind: "checklist", title: "Actions", items: [{ id: "permit", recordId: "readiness_checklist:F2" }] },
  ] } };
  assert.deepEqual(validateChecklistChange({ outputId: "answer", itemId: "permit", done: true }, answers, "Mark the permit done"),
    { key: "answer:permit", changes: { done: true } });
});
