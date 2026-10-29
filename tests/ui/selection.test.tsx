import { expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SelectionTools from "../../src/components/app/SelectionTools";
import { createWorkspace } from "../../src/services/workspaces";
import { WorkspaceHarness } from "./harness";
function setup(top = 200) {
 const workspace = createWorkspace("Audit"); const followUp = vi.fn();
 render(<WorkspaceHarness initial={workspace}><div data-workspace-id={workspace.id}><p data-testid="passage" data-source-id="source-one" data-annotation-title="Award document">Evidence to investigate</p><SelectionTools onFollowUp={followUp} /></div></WorkspaceHarness>);
 const range = document.createRange(); range.selectNodeContents(screen.getByTestId("passage")); range.getBoundingClientRect = () => ({ left: 40, right: 300, top, bottom: top + 20, width: 260, height: 20, x: 40, y: top, toJSON: () => ({}) });
 window.getSelection()!.addRange(range); fireEvent(document, new Event("selectionchange")); return followUp;
}
it("selection tools flip below a passage near the top", () => {
 setup(5); expect(screen.getByRole("group", { name: "Selected text actions" }).parentElement).toHaveAttribute("data-placement", "below");
});
it("selected text follow-up includes the passage and source without submitting", async () => {
 const user = userEvent.setup(); const followUp = setup(); await user.click(screen.getByRole("button", { name: "Ask follow-up" })); expect(followUp).toHaveBeenCalledWith(expect.stringContaining("Evidence to investigate")); expect(followUp).toHaveBeenCalledWith(expect.stringContaining("Award document")); expect(screen.queryByRole("group", { name: "Selected text actions" })).not.toBeInTheDocument();
});
it("a selected passage note saves its quote and source provenance", async () => {
 const user = userEvent.setup(); setup(); await user.click(screen.getByRole("button", { name: "Note" })); const tools = screen.getByRole("group", { name: "Selected text actions" }).parentElement!; await user.type(within(tools).getByLabelText("Your note"), "Verify this"); await user.click(within(tools).getByRole("button", { name: "Save note" })); expect(JSON.parse(screen.getByTestId("workspace-data").textContent!).entries[0]).toMatchObject({ quote: "Evidence to investigate", sourceId: "source-one", note: "Verify this" });
});
it("Escape dismisses the toolbar without saving a new entry", async () => {
 const user = userEvent.setup(); setup(); await user.keyboard("{Escape}"); expect(screen.queryByRole("group", { name: "Selected text actions" })).not.toBeInTheDocument(); expect(JSON.parse(screen.getByTestId("workspace-data").textContent!).entries).toHaveLength(0);
});
