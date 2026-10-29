import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { selectionToolsPosition } from "../services/selectionTools";
import { createWorkspace, parseWorkspaces, saveNotebookEntry } from "../services/workspaces";
import { WorkspaceContext } from "../components/app/WorkspaceContext";
import SourceAnnotations from "../components/app/SourceAnnotations";
import { Notebook } from "../components/app/WorkspaceTools";

test("selection tools flip below near the top and above near the bottom", () => {
  const viewport = { width: 390, height: 844 };
  const below = selectionToolsPosition({ left: 0, right: 100, top: 10, bottom: 30 }, viewport);
  assert.equal(below.side, "below"); assert.ok(below.top >= 30); assert.ok(below.left >= 8);
  const above = selectionToolsPosition({ left: 320, right: 390, top: 800, bottom: 825 }, viewport);
  assert.equal(above.side, "above"); assert.ok(above.top < 800); assert.ok(above.left + above.width <= 382);
  for (const expanded of [false, true]) {
    const position = selectionToolsPosition({ left: 0, right: 320, top: 100, bottom: 200 }, { width: 320, height: 240 }, expanded);
    assert.ok(position.top >= 8); assert.ok(position.left + position.width <= 312);
  }
});
test("source and highlight annotations retain provenance across reload and notebook edits", () => {
  const workspace = saveNotebookEntry(createWorkspace("Audit"), { id: "highlight-one", sourceId: "source-one", quote: "Quoted source passage", title: "Original document", preview: "", note: "Check this", tags: ["audit"], updatedAt: "2026-10-28T12:00:00Z" });
  const restored = parseWorkspaces(JSON.stringify({ version: 1, activeId: workspace.id, workspaces: [workspace] })).workspaces[0];
  assert.equal(restored.entries[0].quote, "Quoted source passage"); assert.equal(restored.entries[0].sourceId, "source-one");
  const html = renderToStaticMarkup(<WorkspaceContext.Provider value={{ workspace: restored, update: () => {} }}><SourceAnnotations id="source-one" title="Original document" text="Source passage" /><Notebook onOpenAnswer={() => {}} onOpenSource={() => {}} /></WorkspaceContext.Provider>);
  assert.match(html, /Add tag/); assert.match(html, /Source annotation/); assert.match(html, /Quoted source passage/); assert.match(html, /Open source/);
  assert.equal(renderToStaticMarkup(<SourceAnnotations id="source-one" title="Source" text="Passage" />), "");
});
