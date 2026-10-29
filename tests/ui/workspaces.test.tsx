import { expect, it, vi } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChatWorkspace, { type ChatThreadProps } from "../../src/components/app/ChatWorkspace";
import { WORKSPACE_STORAGE_KEY } from "../../src/services/workspaces";
function Thread({ threadId }: ChatThreadProps) { return <p>Research thread {threadId}</p>; }
it("creates a named workspace, renames it and restores the active selection", async () => {
 const user = userEvent.setup(); const { unmount } = render(<ChatWorkspace Thread={Thread} configured />);
 await screen.findByRole("textbox", { name: "Workspace name" }); await user.click(screen.getByRole("button", { name: "New workspace" }));
 const dialog = screen.getByRole("dialog"); await user.type(within(dialog).getByRole("textbox", { name: "Workspace name" }), "Audit review"); await user.click(within(dialog).getByRole("button", { name: "Create workspace" }));
 const title = screen.getByRole("textbox", { name: "Workspace name" }); await user.clear(title); await user.type(title, "Portfolio audit{Enter}");
 await waitFor(() => expect(localStorage.getItem(WORKSPACE_STORAGE_KEY)).toContain("Portfolio audit")); unmount(); render(<ChatWorkspace Thread={Thread} configured />);
 expect(await screen.findByRole("textbox", { name: "Workspace name" })).toHaveValue("Portfolio audit"); expect(screen.getByRole("button", { name: "My research" })).toHaveAttribute("aria-pressed", "false");
});
it("canceling workspace creation does not add a workspace", async () => {
 const user = userEvent.setup(); render(<ChatWorkspace Thread={Thread} configured />); await screen.findByRole("textbox", { name: "Workspace name" }); await user.click(screen.getByRole("button", { name: "New workspace" })); await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }));
 expect(screen.queryByRole("dialog")).not.toBeInTheDocument(); expect(JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_KEY)!).workspaces).toHaveLength(1);
});
it("invalid saved data shows recovery guidance and is never overwritten", async () => {
 localStorage.setItem(WORKSPACE_STORAGE_KEY, "broken data"); render(<ChatWorkspace Thread={Thread} configured />); expect(await screen.findByRole("alert")).toHaveTextContent("stored data has not been replaced"); expect(localStorage.getItem(WORKSPACE_STORAGE_KEY)).toBe("broken data");
});
it("storage quota errors remain visible rather than claiming changes are saved", async () => {
 vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Full", "QuotaExceededError"); }); render(<ChatWorkspace Thread={Thread} configured />); expect(await screen.findByRole("alert")).toHaveTextContent("could not be saved");
});
