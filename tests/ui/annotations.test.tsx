import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AnswerNotes from "../../src/components/app/AnswerNotes";
import { Notebook } from "../../src/components/app/WorkspaceTools";
import SourceAnnotations from "../../src/components/app/SourceAnnotations";
import { createWorkspace } from "../../src/services/workspaces";
import { WorkspaceHarness } from "./harness";
const note = { id: "q", questionId: "q", title: "Award review", preview: "Evidence", note: "Original note", tags: ["audit"], updatedAt: "2026-10-28T12:00:00Z" };
function saved() { return { ...createWorkspace("Audit"), entries: [note, { ...note, id: "other", title: "Other finding" }] }; }
describe("answer and source annotations", () => {
  it("saves a personal note without changing the answer", async () => {
    const user = userEvent.setup(); render(<WorkspaceHarness><AnswerNotes questionId="q" question="Award review" preview="Evidence" /></WorkspaceHarness>);
    await user.click(screen.getByRole("button", { name: "Note" }));
    await user.type(screen.getByLabelText("Your note"), "Verify the original"); await user.click(screen.getByRole("button", { name: "Save note" }));
    expect(screen.getByText("Verify the original")).toBeVisible(); expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(JSON.parse(screen.getByTestId("workspace-data").textContent!).entries[0]).toMatchObject({ questionId: "q", preview: "Evidence", note: "Verify the original" });
  });
  it("cancel leaves the saved note unchanged", async () => {
    const user = userEvent.setup(); render(<WorkspaceHarness initial={saved()}><AnswerNotes questionId="q" question="Award review" preview="Evidence" /></WorkspaceHarness>);
    await user.click(screen.getByRole("button", { name: "Edit note" })); await user.clear(screen.getByLabelText("Your note")); await user.type(screen.getByLabelText("Your note"), "Discard me"); await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByText("Original note")).toBeVisible(); expect(screen.queryByText("Discard me")).not.toBeInTheDocument();
  });
  it("normalizes duplicate tags and allows removing one", async () => {
    const user = userEvent.setup(); render(<WorkspaceHarness><AnswerNotes questionId="q" question="Review" preview="" /></WorkspaceHarness>);
    await user.click(screen.getByRole("button", { name: "Add tag" })); await user.type(screen.getByLabelText("Tags, separated by commas"), " Audit, audit, Budget "); await user.click(screen.getByRole("button", { name: "Save tags" }));
    expect(screen.getAllByRole("button", { name: /Remove tag/ })).toHaveLength(2); await user.click(screen.getByRole("button", { name: "Remove tag audit" })); expect(screen.queryByRole("button", { name: "Remove tag audit" })).not.toBeInTheDocument();
  });
  it("source annotations save a source ID rather than an answer ID", async () => {
    const user = userEvent.setup(); render(<WorkspaceHarness><SourceAnnotations id="source-1" title="Award source" text="Original passage" /></WorkspaceHarness>);
    await user.click(screen.getByRole("button", { name: "Note" })); await user.type(screen.getByLabelText("Your note"), "Read again"); await user.click(screen.getByRole("button", { name: "Save note" }));
    const entry = JSON.parse(screen.getByTestId("workspace-data").textContent!).entries[0]; expect(entry.sourceId).toBe("source-1"); expect(entry.questionId).toBeUndefined();
  });
});
describe("Notebook", () => {
  it("edits inside the selected card and keeps that card in place after save", async () => {
    const user = userEvent.setup(); render(<WorkspaceHarness initial={saved()}><Notebook onOpenAnswer={vi.fn()} /></WorkspaceHarness>);
    const cards = screen.getAllByRole("article"); const target = cards[1];
    await user.click(within(target).getByRole("button", { name: "Edit note" })); expect(within(target).getByLabelText("Your note")).toHaveValue("Original note"); expect(within(cards[0]).queryByRole("textbox")).not.toBeInTheDocument();
    await user.clear(within(target).getByLabelText("Your note")); await user.type(within(target).getByLabelText("Your note"), "Updated in place"); await user.click(within(target).getByRole("button", { name: "Save note" }));
    expect(screen.getAllByRole("article")[1]).toBe(target); expect(within(target).getByText("Updated in place")).toBeVisible();
  });
  it("filters by search and shows a useful empty state", async () => {
    const user = userEvent.setup(); render(<WorkspaceHarness initial={saved()}><Notebook onOpenAnswer={vi.fn()} /></WorkspaceHarness>);
    await user.type(screen.getByRole("textbox", { name: "Search notebook" }), "Other finding"); expect(screen.getAllByRole("article")).toHaveLength(1);
    await user.clear(screen.getByRole("textbox", { name: "Search notebook" })); await user.type(screen.getByRole("textbox", { name: "Search notebook" }), "not-found"); expect(screen.getByText("No matching notes")).toBeVisible();
  });
  it("creates a standalone note and filters using its tag", async () => {
    const user = userEvent.setup(); render(<WorkspaceHarness><Notebook onOpenAnswer={vi.fn()} /></WorkspaceHarness>);
    await user.click(screen.getByRole("button", { name: "New note" })); await user.type(screen.getByLabelText("Title"), "Audit scope"); await user.type(screen.getByLabelText("Your note"), "Compare three projects"); await user.type(screen.getByLabelText("Tags, separated by commas"), "scope"); await user.click(screen.getByRole("button", { name: "Save note" }));
    expect(screen.getByRole("heading", { name: "Audit scope" })).toBeVisible(); await user.click(screen.getAllByRole("button", { name: "scope" })[0]); expect(screen.getAllByRole("article")).toHaveLength(1);
  });
  it("opens the original source and retains provenance when edited", async () => {
    const user = userEvent.setup(); const onOpenSource = vi.fn(); const initial = { ...createWorkspace("Audit"), entries: [{ ...note, questionId: undefined, sourceId: "source-1", quote: "Selected evidence" }] };
    render(<WorkspaceHarness initial={initial}><Notebook onOpenAnswer={vi.fn()} onOpenSource={onOpenSource} /></WorkspaceHarness>);
    await user.click(screen.getByRole("button", { name: "Open source" })); expect(onOpenSource).toHaveBeenCalledWith("source-1"); await user.click(screen.getByRole("button", { name: "Edit note" })); await user.click(screen.getByRole("button", { name: "Save note" }));
    expect(JSON.parse(screen.getByTestId("workspace-data").textContent!).entries[0]).toMatchObject({ sourceId: "source-1", quote: "Selected evidence" });
  });
});
