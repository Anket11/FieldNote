import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { createWorkspace, normalizeTags, parseWorkspaces, saveNotebookEntry, updateWorkspace, type WorkspaceStore } from "../services/workspaces";
import { WorkspaceContext } from "../components/app/WorkspaceContext";
import AnswerNotes from "../components/app/AnswerNotes";
import { Notebook, WorkspacePlan } from "../components/app/WorkspaceTools";

const makeStore = (): WorkspaceStore => { const workspace = createWorkspace("Audit across projects"); return { version: 1, activeId: workspace.id, workspaces: [workspace] }; };
test("workspace snapshots round-trip messages, rendered answers, annotations and tasks", () => {
  const store = makeStore();
  const workspace = store.workspaces[0];
  workspace.research.messages = [{ id: "q", role: "user", content: "Compare the projects" }, { id: "a", role: "assistant", toolCalls: [{ id: "tool", type: "function", function: { name: "presentResearchAnswer", arguments: "{}" } }] }, { id: "result", role: "tool", toolCallId: "tool", content: "{\"displayed\":true}" }];
  workspace.research.answers.tool = { claims: [{ text: "Evidence is limited.", citationIds: [] }] };
  workspace.research.answerQueries.tool = "Compare the projects";
  workspace.research.checklistEdits["tool:item"] = { done: true, notes: "Reviewed" };
  workspace.entries = [{ id: "q", questionId: "q", title: "Compare the projects", preview: "Evidence is limited.", note: "Check the source.", tags: ["audit"], updatedAt: "2026-10-28T12:00:00Z" }];
  workspace.tasks = [{ id: "task", text: "Review evidence", done: true }];
  assert.deepEqual(parseWorkspaces(JSON.stringify(store)), store);
});
test("workspace edits are isolated and cannot rename another workspace", () => {
  const store = makeStore(); const second = createWorkspace("Accounting"); store.workspaces.push(second);
  const next = updateWorkspace(store, second.id, (workspace) => ({ ...workspace, title: "Accounting review", tasks: [{ id: "one", text: "Check totals", done: false }] }));
  assert.equal(next.workspaces[0], store.workspaces[0]);
  assert.equal(next.workspaces[1].title, "Accounting review");
  assert.equal(store.workspaces[1].tasks.length, 0);
  assert.equal(store.workspaces[0].title, "Audit across projects");
});
test("tags normalize duplicates, whitespace and case with bounded lengths", () => {
  assert.deepEqual(normalizeTags(" Audit, audit, , Finance , EVIDENCE "), ["audit", "finance", "evidence"]);
  assert.equal(normalizeTags("x".repeat(80))[0].length, 40);
  assert.equal(normalizeTags(Array.from({ length: 25 }, (_, n) => `tag${n}`).join(",")).length, 20);
});
test("annotations update by answer ID and empty annotations leave the notebook", () => {
  const workspace = createWorkspace("Research");
  const entry = { id: "q", questionId: "q", title: "Question", note: "First", preview: "Answer", tags: ["audit"], updatedAt: "today" };
  const saved = saveNotebookEntry(workspace, entry);
  const changed = saveNotebookEntry(saved, { ...entry, note: "Revised" });
  assert.equal(changed.entries.length, 1); assert.equal(changed.entries[0].note, "Revised");
  assert.equal(saved.entries[0].note, "First");
  assert.equal(saveNotebookEntry(changed, { ...entry, note: "", tags: [] }).entries.length, 0);
});
test("malformed or incompatible storage fails safely instead of silently discarding it", () => {
  assert.throws(() => parseWorkspaces("not json"));
  const store = makeStore();
  assert.throws(() => parseWorkspaces(JSON.stringify({ ...store, version: 2 })));
  assert.throws(() => parseWorkspaces(JSON.stringify({ ...store, workspaces: [...store.workspaces, ...store.workspaces] })));
  store.workspaces[0].research.answers.invalid = { claims: [{ text: "Invented", recordId: "missing", citationIds: ["fake"] }] };
  assert.throws(() => parseWorkspaces(JSON.stringify(store)));
});
test("restored in-progress research is marked interrupted and stale selection has a fallback", () => {
  const store = makeStore(); store.activeId = "missing";
  store.workspaces[0].research.runs.q = { runId: "run", state: "running", status: "Searching", sourceIds: [], tasks: [], activity: [] };
  const restored = parseWorkspaces(JSON.stringify(store));
  assert.equal(restored.activeId, store.workspaces[0].id);
  assert.equal(restored.workspaces[0].research.runs.q.state, "stopped");
});
test("workspace tools render escaped personal notes and accessible research actions", () => {
  const workspace = createWorkspace("Audit");
  workspace.entries = [{ id: "q", questionId: "q", title: "Question", preview: "Answer", note: "<script>not executable</script>", tags: ["audit"], updatedAt: "2026-10-28T12:00:00Z" }];
  const html = renderToStaticMarkup(<WorkspaceContext.Provider value={{ workspace, update: () => {} }}><AnswerNotes questionId="q" question="Question" preview="Answer" /><Notebook onOpenAnswer={() => {}} /><WorkspacePlan /></WorkspaceContext.Provider>);
  assert.match(html, /Edit note/); assert.match(html, /Edit tags/); assert.match(html, /Open answer/); assert.match(html, /New task/);
  assert.doesNotMatch(html, /<script>/); assert.match(html, /&lt;script&gt;/);
});


test("editing a saved note keeps its card in place", () => {
  const entry = { id: "first", title: "First", note: "Original", preview: "", tags: [], updatedAt: "2026-10-28T12:00:00Z" };
  const workspace = saveNotebookEntry(saveNotebookEntry(createWorkspace("Audit"), entry), { ...entry, id: "second", title: "Second" });
  const updated = saveNotebookEntry(workspace, { ...entry, note: "Edited", updatedAt: "2026-10-29T12:00:00Z" });
  assert.deepEqual(updated.entries.map((item) => item.id), workspace.entries.map((item) => item.id));
  assert.equal(updated.entries.find((item) => item.id === "first")?.note, "Edited");
});
